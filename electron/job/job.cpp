#include "job.h"
#include <string>
#ifndef PSAPI_VERSION
#define PSAPI_VERSION 2
#endif
#include <psapi.h>
#include <chrono>

// ─────────────────────────────────────────────────────────────────────────────
// Class registration
// ─────────────────────────────────────────────────────────────────────────────

Napi::Object JobObjectWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "JobObject", {
        InstanceMethod("assignProcess",  &JobObjectWrapper::AssignProcess),
        InstanceMethod("getStats",       &JobObjectWrapper::GetStats),
        InstanceMethod("terminate",      &JobObjectWrapper::Terminate),
        InstanceMethod("close",          &JobObjectWrapper::Close),
        InstanceMethod("startMonitor",   &JobObjectWrapper::StartMonitor),
        InstanceMethod("stopMonitor",    &JobObjectWrapper::StopMonitor),
    });

    exports.Set("JobObject", func);
    return exports;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constructor / Destructor
// ─────────────────────────────────────────────────────────────────────────────

JobObjectWrapper::JobObjectWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<JobObjectWrapper>(info), jobHandle(NULL) {
    Napi::Env env = info.Env();

    std::wstring jobName;
    if (info.Length() > 0 && info[0].IsString()) {
        std::string nameStr = info[0].As<Napi::String>().Utf8Value();
        jobName = std::wstring(nameStr.begin(), nameStr.end());
    }

    jobHandle = CreateJobObjectW(NULL, jobName.empty() ? NULL : jobName.c_str());

    if (jobHandle == NULL) {
        Napi::Error::New(env, "Failed to create/open Job Object").ThrowAsJavaScriptException();
        return;
    }

    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limitInfo = {};
    limitInfo.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    SetInformationJobObject(jobHandle, JobObjectExtendedLimitInformation, &limitInfo, sizeof(limitInfo));
}

JobObjectWrapper::~JobObjectWrapper() {
    // Stop sampling thread before destroying
    if (monitoring.load()) {
        stopFlag.store(true);
        if (samplerThread.joinable()) {
            samplerThread.join();
        }
        std::lock_guard<std::mutex> lock(tsfnMutex);
        if (tsfn) {
            tsfn.Release();
        }
        monitoring.store(false);
    }

    if (jobHandle) {
        CloseHandle(jobHandle);
        jobHandle = NULL;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// assignProcess
// ─────────────────────────────────────────────────────────────────────────────

Napi::Value JobObjectWrapper::AssignProcess(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Process ID must be a number").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (!jobHandle) {
        Napi::Error::New(env, "Job handle is closed").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    HANDLE process = OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, FALSE, pid);

    if (process == NULL) {
        Napi::Error::New(env, "Failed to open process with PID " + std::to_string(pid)).ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (!AssignProcessToJobObject(jobHandle, process)) {
        CloseHandle(process);
        Napi::Error::New(env, "Failed to assign process to Job Object").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    CloseHandle(process);
    return env.Undefined();
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: collect a stats sample (called from both GetStats and sampler)
// ─────────────────────────────────────────────────────────────────────────────

StatsSample JobObjectWrapper::CollectStats() {
    StatsSample s{};

    if (!jobHandle) return s;

    JOBOBJECT_BASIC_ACCOUNTING_INFORMATION basicInfo = {};
    if (QueryInformationJobObject(jobHandle, JobObjectBasicAccountingInformation, &basicInfo, sizeof(basicInfo), NULL)) {
        s.totalUserTime   = (double)basicInfo.TotalUserTime.QuadPart;
        s.totalKernelTime = (double)basicInfo.TotalKernelTime.QuadPart;
        s.activeProcesses = basicInfo.ActiveProcesses;
    }

    DWORD maxPids = 256;
    DWORD cb = (DWORD)(sizeof(JOBOBJECT_BASIC_PROCESS_ID_LIST) + ((maxPids - 1) * sizeof(ULONG_PTR)));
    std::vector<char> buffer(cb);
    PJOBOBJECT_BASIC_PROCESS_ID_LIST pidList = reinterpret_cast<PJOBOBJECT_BASIC_PROCESS_ID_LIST>(buffer.data());

    if (QueryInformationJobObject(jobHandle, JobObjectBasicProcessIdList, pidList, cb, &cb)) {
        for (DWORD i = 0; i < pidList->NumberOfProcessIdsInList; i++) {
            DWORD pid = (DWORD)pidList->ProcessIdList[i];
            s.pids.push_back(pid);

            HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
            if (hProcess) {
                PROCESS_MEMORY_COUNTERS pmc;
                if (GetProcessMemoryInfo(hProcess, &pmc, sizeof(pmc))) {
                    s.memory += (double)pmc.WorkingSetSize;
                }
                CloseHandle(hProcess);
            }
        }
    }

    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// getStats (existing synchronous one-off call, unchanged behavior)
// ─────────────────────────────────────────────────────────────────────────────

Napi::Value JobObjectWrapper::GetStats(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!jobHandle) {
        Napi::Error::New(env, "Job handle is closed").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    StatsSample s = CollectStats();

    Napi::Object result = Napi::Object::New(env);
    result.Set("totalUserTime",   Napi::Number::New(env, s.totalUserTime));
    result.Set("totalKernelTime", Napi::Number::New(env, s.totalKernelTime));
    result.Set("activeProcesses", Napi::Number::New(env, s.activeProcesses));
    result.Set("memory",          Napi::Number::New(env, s.memory));

    Napi::Array pidsArr = Napi::Array::New(env, s.pids.size());
    for (size_t i = 0; i < s.pids.size(); i++) {
        pidsArr.Set((uint32_t)i, Napi::Number::New(env, s.pids[i]));
    }
    result.Set("pids", pidsArr);

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// terminate
// ─────────────────────────────────────────────────────────────────────────────

Napi::Value JobObjectWrapper::Terminate(const Napi::CallbackInfo& info) {
    if (jobHandle) {
        DWORD exitCode = 1;
        if (info.Length() > 0 && info[0].IsNumber()) {
            exitCode = info[0].As<Napi::Number>().Uint32Value();
        }
        TerminateJobObject(jobHandle, exitCode);
    }
    return info.Env().Undefined();
}

// ─────────────────────────────────────────────────────────────────────────────
// close
// ─────────────────────────────────────────────────────────────────────────────

Napi::Value JobObjectWrapper::Close(const Napi::CallbackInfo& info) {
    if (jobHandle) {
        CloseHandle(jobHandle);
        jobHandle = NULL;
    }
    return info.Env().Undefined();
}

// ─────────────────────────────────────────────────────────────────────────────
// startMonitor(intervalMs: number, callback: (stats) => void)
// ─────────────────────────────────────────────────────────────────────────────

Napi::Value JobObjectWrapper::StartMonitor(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!jobHandle) {
        Napi::Error::New(env, "Job handle is closed").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsFunction()) {
        Napi::TypeError::New(env, "startMonitor(intervalMs: number, callback: Function)").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Stop any existing monitor first
    if (monitoring.load()) {
        stopFlag.store(true);
        if (samplerThread.joinable()) samplerThread.join();
        std::lock_guard<std::mutex> lock(tsfnMutex);
        if (tsfn) { tsfn.Release(); }
        monitoring.store(false);
    }

    intervalMs = std::max(50, info[0].As<Napi::Number>().Int32Value());
    Napi::Function cb = info[1].As<Napi::Function>();

    {
        std::lock_guard<std::mutex> lock(tsfnMutex);
        tsfn = Napi::ThreadSafeFunction::New(
            env,
            cb,
            "JobStatsMonitor",
            0,   // unlimited queue
            1    // one native thread
        );
    }

    stopFlag.store(false);
    monitoring.store(true);
    samplerThread = std::thread(&JobObjectWrapper::SamplerLoop, this);

    return env.Undefined();
}

// ─────────────────────────────────────────────────────────────────────────────
// stopMonitor()
// ─────────────────────────────────────────────────────────────────────────────

Napi::Value JobObjectWrapper::StopMonitor(const Napi::CallbackInfo& info) {
    if (monitoring.load()) {
        stopFlag.store(true);
        if (samplerThread.joinable()) samplerThread.join();
        std::lock_guard<std::mutex> lock(tsfnMutex);
        if (tsfn) {
            tsfn.Release();
            tsfn = Napi::ThreadSafeFunction();
        }
        monitoring.store(false);
    }
    return info.Env().Undefined();
}

// ─────────────────────────────────────────────────────────────────────────────
// Native sampler loop — runs on a dedicated std::thread
// ─────────────────────────────────────────────────────────────────────────────

void JobObjectWrapper::SamplerLoop() {
    // Keep previous CPU times for delta calculation
    double prevUserTime   = 0.0;
    double prevKernelTime = 0.0;
    bool   firstSample    = true;

    using clock = std::chrono::steady_clock;
    auto prevTick = clock::now();

    while (!stopFlag.load()) {
        Sleep((DWORD)intervalMs);

        if (stopFlag.load() || !jobHandle) break;

        StatsSample s = CollectStats();

        // Compute CPU % using delta of CPU time vs delta of wall clock time
        auto nowTick = clock::now();
        double wallMs = (double)std::chrono::duration_cast<std::chrono::milliseconds>(nowTick - prevTick).count();
        prevTick = nowTick;

        double cpuPercent = 0.0;
        if (!firstSample && wallMs > 0.0) {
            double deltaUser   = s.totalUserTime   - prevUserTime;
            double deltaKernel = s.totalKernelTime - prevKernelTime;
            // CPU times are in 100-nanosecond units; wall time in ms → convert to same
            double wallUnits = wallMs * 10000.0; // ms * 10000 = 100ns units
            SYSTEM_INFO si{};
            GetSystemInfo(&si);
            DWORD numCPUs = si.dwNumberOfProcessors;
            if (numCPUs < 1) numCPUs = 1;
            cpuPercent = ((deltaUser + deltaKernel) / wallUnits / numCPUs) * 100.0;
            if (cpuPercent < 0.0) cpuPercent = 0.0;
        }

        prevUserTime   = s.totalUserTime;
        prevKernelTime = s.totalKernelTime;
        firstSample    = false;

        // Copy data for the callback (heap-allocated, callback frees via delete)
        struct CallbackData {
            double cpuPercent;
            double memory;
            DWORD  activeProcesses;
            std::vector<DWORD> pids;
        };

        auto* data = new CallbackData{cpuPercent, s.memory, s.activeProcesses, s.pids};

        std::lock_guard<std::mutex> lock(tsfnMutex);
        if (!tsfn) { delete data; break; }

        napi_status status = tsfn.NonBlockingCall(data, [](Napi::Env env, Napi::Function jsCallback, CallbackData* d) {
            if (!env || !jsCallback) { delete d; return; }

            Napi::Object obj = Napi::Object::New(env);
            obj.Set("cpu",              Napi::Number::New(env, d->cpuPercent));
            obj.Set("memory",           Napi::Number::New(env, d->memory));
            obj.Set("activeProcesses",  Napi::Number::New(env, d->activeProcesses));

            Napi::Array pidsArr = Napi::Array::New(env, d->pids.size());
            for (size_t i = 0; i < d->pids.size(); i++) {
                pidsArr.Set((uint32_t)i, Napi::Number::New(env, d->pids[i]));
            }
            obj.Set("pids", pidsArr);

            jsCallback.Call({obj});
            delete d;
        });

        if (status != napi_ok) {
            delete data;
            // If the TSFN was closed, stop the loop
            if (status == napi_closing) break;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module entry point
// ─────────────────────────────────────────────────────────────────────────────

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return JobObjectWrapper::Init(env, exports);
}

NODE_API_MODULE(job, InitAll)

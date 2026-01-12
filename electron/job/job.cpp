#include "job.h"
#include <string>
#include <vector>
#ifndef PSAPI_VERSION
#define PSAPI_VERSION 2
#endif
#include <psapi.h>

Napi::Object JobObjectWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "JobObject", {
        InstanceMethod("assignProcess", &JobObjectWrapper::AssignProcess),
        InstanceMethod("getStats", &JobObjectWrapper::GetStats),
        InstanceMethod("terminate", &JobObjectWrapper::Terminate),
        InstanceMethod("close", &JobObjectWrapper::Close),
    });

    exports.Set("JobObject", func);
    return exports;
}

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

    // Only set flags if we created it (or if they aren't set)
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limitInfo = {};
    limitInfo.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

    SetInformationJobObject(
            jobHandle,
            JobObjectExtendedLimitInformation,
            &limitInfo,
            sizeof(limitInfo));
}

JobObjectWrapper::~JobObjectWrapper() {
    if (jobHandle) {
        CloseHandle(jobHandle);
        jobHandle = NULL;
    }
}

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

Napi::Value JobObjectWrapper::GetStats(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!jobHandle) {
        Napi::Error::New(env, "Job handle is closed").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    Napi::Object result = Napi::Object::New(env);

    JOBOBJECT_BASIC_ACCOUNTING_INFORMATION basicInfo = {};
    if (QueryInformationJobObject(jobHandle, JobObjectBasicAccountingInformation, &basicInfo, sizeof(basicInfo), NULL)) {
        result.Set("totalUserTime", Napi::Number::New(env, (double)(basicInfo.TotalUserTime.QuadPart)));
        result.Set("totalKernelTime", Napi::Number::New(env, (double)(basicInfo.TotalKernelTime.QuadPart)));
        result.Set("activeProcesses", Napi::Number::New(env, basicInfo.ActiveProcesses));
    } else {
        result.Set("totalUserTime", Napi::Number::New(env, 0));
        result.Set("totalKernelTime", Napi::Number::New(env, 0));
        result.Set("activeProcesses", Napi::Number::New(env, 0));
    }

    DWORD processCount = 128;
    DWORD cb = sizeof(JOBOBJECT_BASIC_PROCESS_ID_LIST) + ((processCount - 1) * sizeof(ULONG_PTR));
    std::vector<char> buffer(cb);
    PJOBOBJECT_BASIC_PROCESS_ID_LIST pidList = reinterpret_cast<PJOBOBJECT_BASIC_PROCESS_ID_LIST>(buffer.data());

    double totalMemory = 0;
    Napi::Array pidsArr = Napi::Array::New(env);

    if (QueryInformationJobObject(jobHandle, JobObjectBasicProcessIdList, pidList, cb, &cb)) {
        for (DWORD i = 0; i < pidList->NumberOfProcessIdsInList; i++) {
            DWORD pid = (DWORD)pidList->ProcessIdList[i];
            pidsArr.Set(i, Napi::Number::New(env, pid));

            HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
            if (hProcess) {
                PROCESS_MEMORY_COUNTERS pmc;
                if (GetProcessMemoryInfo(hProcess, &pmc, sizeof(pmc))) {
                    totalMemory += (double)pmc.WorkingSetSize;
                }
                CloseHandle(hProcess);
            }
        }
    }

    result.Set("memory", Napi::Number::New(env, totalMemory));
    result.Set("pids", pidsArr);

    return result;
}

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

Napi::Value JobObjectWrapper::Close(const Napi::CallbackInfo& info) {
    if (jobHandle) {
        CloseHandle(jobHandle);
        jobHandle = NULL;
    }
    return info.Env().Undefined();
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return JobObjectWrapper::Init(env, exports);
}

NODE_API_MODULE(job, InitAll)

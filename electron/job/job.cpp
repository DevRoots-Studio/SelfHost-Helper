#include "job.h"
#include <string>

Napi::Object JobObjectWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "JobObject", {
        InstanceMethod("assignProcess", &JobObjectWrapper::AssignProcess),
        InstanceMethod("close", &JobObjectWrapper::Close),
    });

    exports.Set("JobObject", func);
    return exports;
}

JobObjectWrapper::JobObjectWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<JobObjectWrapper>(info), jobHandle(NULL) {
    Napi::Env env = info.Env();

    jobHandle = CreateJobObject(NULL, NULL);
    if (jobHandle == NULL) {
        Napi::Error::New(env, "Failed to create Job Object").ThrowAsJavaScriptException();
        return;
    }

    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limitInfo = {};
    limitInfo.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

    if (!SetInformationJobObject(
            jobHandle,
            JobObjectExtendedLimitInformation,
            &limitInfo,
            sizeof(limitInfo))) {
        CloseHandle(jobHandle);
        jobHandle = NULL;
        Napi::Error::New(env, "Failed to set Job Object information").ThrowAsJavaScriptException();
    }
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
    // PROCESS_SET_QUOTA and PROCESS_TERMINATE are required to assign a process to a job object
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

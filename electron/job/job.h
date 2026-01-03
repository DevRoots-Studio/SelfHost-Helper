#pragma once
#include <napi.h>
#include <windows.h>

class JobObjectWrapper : public Napi::ObjectWrap<JobObjectWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    JobObjectWrapper(const Napi::CallbackInfo& info);
    ~JobObjectWrapper();

private:
    HANDLE jobHandle;

    Napi::Value AssignProcess(const Napi::CallbackInfo& info);
    Napi::Value Close(const Napi::CallbackInfo& info);
};

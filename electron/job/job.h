#pragma once
#include <napi.h>
#include <windows.h>
#include <thread>
#include <atomic>
#include <mutex>
#include <vector>

struct StatsSample {
    double totalUserTime;
    double totalKernelTime;
    double memory;
    DWORD  activeProcesses;
    std::vector<DWORD> pids;
};

class JobObjectWrapper : public Napi::ObjectWrap<JobObjectWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    JobObjectWrapper(const Napi::CallbackInfo& info);
    ~JobObjectWrapper();

private:
    HANDLE jobHandle;

    // --- monitor state ---
    std::thread         samplerThread;
    std::atomic<bool>   stopFlag{false};
    std::atomic<bool>   monitoring{false};
    int                 intervalMs{500};
    Napi::ThreadSafeFunction tsfn;
    std::mutex          tsfnMutex;

    // --- N-API methods ---
    Napi::Value AssignProcess(const Napi::CallbackInfo& info);
    Napi::Value GetStats(const Napi::CallbackInfo& info);
    Napi::Value Terminate(const Napi::CallbackInfo& info);
    Napi::Value Close(const Napi::CallbackInfo& info);
    Napi::Value StartMonitor(const Napi::CallbackInfo& info);
    Napi::Value StopMonitor(const Napi::CallbackInfo& info);

    // --- internal ---
    void SamplerLoop();
    StatsSample CollectStats();
};

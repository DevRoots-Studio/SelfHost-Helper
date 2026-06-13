import path from "path";

const sessionExternalMediaBases = new Set();

export const allowExternalMediaPath = (filePath) => {
  if (!filePath || typeof filePath !== "string") return;
  sessionExternalMediaBases.add(path.dirname(path.resolve(filePath)));
};

export const getSessionExternalMediaBases = () => [...sessionExternalMediaBases];

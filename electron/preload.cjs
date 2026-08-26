const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("numberSober", {
  chooseBackupDir: () => ipcRenderer.invoke("choose-backup-dir"),
  getBackupDir: () => ipcRenderer.invoke("get-backup-dir"),
});

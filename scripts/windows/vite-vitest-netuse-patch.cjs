const childProcess = require('node:child_process');
const fs = require('node:fs');

const realExec = childProcess.exec;
const nativeRealpathSync = typeof fs.realpathSync.native === 'function'
  ? fs.realpathSync.native.bind(fs)
  : null;

if (process.platform === 'win32' && nativeRealpathSync) {
  fs.realpathSync = function patchedRealpathSync(target, options) {
    return nativeRealpathSync(target, options);
  };
  fs.realpathSync.native = nativeRealpathSync;
}

function createStubChild() {
  return {
    pid: undefined,
    stdout: null,
    stderr: null,
    stdin: null,
    kill() {
      return false;
    },
    on() {
      return this;
    },
    once() {
      return this;
    },
    emit() {
      return false;
    },
  };
}

childProcess.exec = function patchedExec(command, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  if (typeof command === 'string' && command.trim().toLowerCase() === 'net use') {
    if (cb) {
      process.nextTick(() => {
        const error = Object.assign(new Error('Blocked net use during local test bootstrap'), {
          code: 'EPERM',
          syscall: 'spawn',
        });
        cb(error, '', '');
      });
    }
    return createStubChild();
  }
  return realExec.apply(this, arguments);
};

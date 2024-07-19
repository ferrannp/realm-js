////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

/* eslint-disable no-restricted-globals */

import { inspect } from "node:util";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import v8 from "node:v8";
import vm from "node:vm";

// Set the default depth of objects logged with console.log to improve DX when debugging
inspect.defaultOptions.depth = null;

v8.setFlagsFromString("--expose_gc");

Object.assign(globalThis, {
  fs: {
    exists(path: string) {
      return existsSync(path);
    },
  },
  path: {
    dirname(path: string) {
      return dirname(path);
    },
    resolve(...paths: string[]) {
      return resolve(...paths);
    },
  },
  gc: vm.runInNewContext("gc"),
  async nextUncaughtException(timeoutMs = 5000) {
    // Remove any other listeners, storing them later so they can be restored
    const listenersBefore = process.listeners("uncaughtException");
    process.removeAllListeners("uncaughtException");
    try {
      return await new Promise<Error>((resolve, reject) => {
        const timeoutTimer = setTimeout(() => {
          process.off("uncaughtException", handleException);
          const error = new Error(`Timed out waiting for uncaught exception (waited ${timeoutMs} ms)`);
          reject(error);
        }, timeoutMs);
        function handleException(error: Error) {
          clearTimeout(timeoutTimer);
          resolve(error);
        }
        process.once("uncaughtException", handleException);
      });
    } finally {
      for (const listener of listenersBefore) {
        process.addListener("uncaughtException", listener);
      }
    }
  },
});

// Indicate that the tests are running in Node
environment.node = true;

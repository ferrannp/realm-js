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
import { App, BSON } from "realm";

import { AppImporter, Credentials } from "@realm/app-importer";
import { fetch } from "./fetch";

export type TemplateReplacements = Record<string, Record<string, unknown>>;
export type ErrorResponse = { message: string; appId: never };
export type ImportResponse = { appId: string; message: never };
export type Response = ImportResponse | ErrorResponse;

//TODO should be moved to a separate file as it doesn't directly have anything to do with importing an app.
export function getUrls() {
  // Try reading the app importer URL out of the environment, it might not be accessiable via localhost
  const { appImporterUrl, realmBaseUrl } = environment;
  return {
    appImporterUrl: typeof appImporterUrl === "string" ? appImporterUrl : "http://localhost:8091",
    baseUrl: typeof realmBaseUrl === "string" ? realmBaseUrl : "http://localhost:9090",
  };
}

const { appImporterIsRemote, appTemplatesPath = "../../realm-apps" } = environment;

function getCredentials(): Credentials {
  const { publicKey, privateKey, username, password } = environment;
  if (typeof publicKey === "string" && typeof privateKey === "string") {
    return {
      kind: "api-key",
      publicKey,
      privateKey,
    };
  }
  return {
    kind: "username-password",
    username: typeof username === "string" ? username : "unique_user@domain.com",
    password: typeof password === "string" ? password : "password",
  };
}

function generateDatabaseName(): string {
  return `test-database-${new BSON.ObjectID().toHexString()}`;
}

export function getDefaultReplacements(name: string, databaseName: string): TemplateReplacements {
  // When running on CI we connect through mongodb-atlas instead of local-mongodb
  const { mongodbClusterName } = environment;

  const config: Record<string, any> = {};
  const mongodbServiceConfig: Record<string, any> = {};

  if (name === "with-db" || name === "with-db-flx") {
    mongodbServiceConfig.config = {
      clusterName: mongodbClusterName,
      readPreference: "primary",
      wireProtocolEnabled: false,
      [name === "with-db" ? "sync" : "flexible_sync"]: {
        database_name: databaseName,
      },
    };
  }

  if (typeof mongodbClusterName === "string") {
    config.name = `${name}-${mongodbClusterName}`;
    mongodbServiceConfig.type = "mongodb-atlas";
    if (typeof mongodbServiceConfig.config !== "object") {
      mongodbServiceConfig.config = {};
    }
    mongodbServiceConfig.config.clusterName = mongodbClusterName;
  }

  return {
    "config.json": config,
    "services/mongodb/config.json": mongodbServiceConfig,
    "services/mongodb/rules/*.json": {
      database: databaseName,
    },
  };
}

export async function importApp(
  name: string,
  replacements?: TemplateReplacements,
): Promise<{ appId: string; baseUrl: string; databaseName: string }> {
  const { baseUrl, appImporterUrl } = getUrls();

  const databaseName = generateDatabaseName();

  if (!replacements) {
    replacements = getDefaultReplacements(name, databaseName);
  }

  if (appImporterIsRemote) {
    const response = await fetch(appImporterUrl, {
      method: "POST",
      body: JSON.stringify({ name, replacements }),
    });

    const json = await response.json<Response>();
    if (response.ok && typeof json.appId === "string") {
      return { appId: json.appId, baseUrl, databaseName };
    } else if (typeof json.message === "string") {
      throw new Error(`Failed to import: ${json.message}`);
    } else {
      throw new Error("Failed to import app");
    }
  } else {
    const appsDirectoryPath = "./realm-apps";
    const realmConfigPath = "./realm-config";

    const credentials = getCredentials();

    const importer = new AppImporter({
      baseUrl,
      credentials,
      realmConfigPath,
      appsDirectoryPath,
      cleanUp: true,
    });

    const appTemplatePath = `${appTemplatesPath}/${name}`;

    const { appId } = await importer.importApp(appTemplatePath, replacements);

    return { appId, baseUrl, databaseName };
  }
}

export async function deleteApp(clientAppId: string): Promise<void> {
  const { baseUrl, appImporterUrl } = getUrls();

  if (appImporterIsRemote) {
    // This might take some time, so we just send it and forget it
    fetch(`${appImporterUrl}/app/${clientAppId}`, {
      method: "DELETE",
    });
  } else {
    const appsDirectoryPath = "./realm-apps";
    const realmConfigPath = "./realm-config";

    const credentials = getCredentials();

    const importer = new AppImporter({
      baseUrl,
      credentials,
      realmConfigPath,
      appsDirectoryPath,
      cleanUp: true,
    });

    importer.deleteApp(clientAppId);
  }
}

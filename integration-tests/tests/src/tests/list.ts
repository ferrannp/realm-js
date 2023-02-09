////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { expect } from "chai";
import { Realm } from "realm";

import { openRealmBefore } from "../hooks";

type Item<T = unknown> = { list: Realm.List<T> };

describe.only("List", () => {
  describe.only("with unconstrained (mixed) values", () => {
    openRealmBefore({
      schema: [
        {
          name: "Item",
          properties: { list: { type: "list", objectType: "mixed" } },
        },
      ],
    });

    it("supports remove", function (this: RealmContext) {
      const { list } = this.realm.write(() =>
        this.realm.create<Item>("Item", {
          list: [2, 5, 8, 14, 57],
        }),
      );

      expect([...list]).deep.equals([2, 5, 8, 14, 57]);

      this.realm.write(() => {
        list.remove(0);
      });

      expect([...list]).deep.equals([5, 8, 14, 57]);

      this.realm.write(() => {
        list.remove(3);
      });

      expect([...list]).deep.equals([5, 8, 14]);
    });

    it("supports move", function (this: RealmContext) {
      const { list } = this.realm.write(() =>
        this.realm.create<Item>("Item", {
          list: [2, 5, 8, 14, 57],
        }),
      );

      expect([...list]).deep.equals([2, 5, 8, 14, 57]);

      this.realm.write(() => {
        list.move(0, 3);
      });

      expect([...list]).deep.equals([5, 8, 14, 2, 57]);

      this.realm.write(() => {
        list.move(2, 1);
      });

      expect([...list]).deep.equals([5, 14, 8, 2, 57]);
    });

    it("supports swap", function (this: RealmContext) {
      const { list } = this.realm.write(() =>
        this.realm.create<Item>("Item", {
          list: [2, 5, 8, 14, 57],
        }),
      );

      expect([...list]).deep.equals([2, 5, 8, 14, 57]);

      this.realm.write(() => {
        list.swap(0, 3);
      });

      expect([...list]).deep.equals([14, 5, 8, 2, 57]);

      this.realm.write(() => {
        list.swap(2, 1);
      });

      expect([...list]).deep.equals([14, 8, 5, 2, 57]);
    });
  });
});

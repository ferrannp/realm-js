////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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
import { Counter, ObjectSchema } from "realm";

import { openRealmBeforeEach } from "../hooks";

interface IWithCounter {
  counter: Counter;
}

const WithCounterSchema: ObjectSchema = {
  name: "WithCounter",
  properties: {
    counter: "counter",
  },
};

interface IWithOptAndDefaultCounter {
  optionalCounter?: Counter | null;
  counterWithDefault: Counter;
}

const WithOptAndDefaultCounterSchema: ObjectSchema = {
  name: "WithOptAndDefaultCounter",
  properties: {
    optionalCounter: "counter?",
    counterWithDefault: { type: "counter", default: 0 },
    // TODO(lj): Add a 'listOfOptionalCounters'?
  },
};

interface IWithCounterCollections {
  list: Realm.List<Counter>;
  dictionary: Realm.Dictionary<Counter>;
  set: Realm.Set<Counter>;
}

const WithCounterCollectionsSchema: ObjectSchema = {
  name: "WithCounterCollections",
  properties: {
    list: "counter[]",
    dictionary: "counter{}",
    set: "counter<>",
  },
};

function expectCounter(value: unknown): asserts value is Counter {
  expect(value).to.be.instanceOf(Counter);
}

function expectKeys(dictionary: Realm.Dictionary, keys: string[]) {
  expect(Object.keys(dictionary)).members(keys);
}

describe("Counter", () => {
  openRealmBeforeEach({ schema: [WithCounterSchema, WithOptAndDefaultCounterSchema, WithCounterCollectionsSchema] });

  const initialValuesList = [-100, 0, 1, 1000] as const;
  const initialValuesDict: Readonly<Record<string, number>> = {
    negative100: -100,
    _0: 0,
    _1: 1,
    _1000: 1000,
  };

  describe("Create and access", () => {
    describe("Via 'realm.create()'", () => {
      it("can create and access (input: number)", function (this: RealmContext) {
        for (let i = 0; i < initialValuesList.length; i++) {
          const input = initialValuesList[i];
          const { counter } = this.realm.write(() => {
            console.log({ input });
            return this.realm.create<IWithCounter>(WithCounterSchema.name, {
              counter: input,
            });
          });

          const expectedNumObjects = i + 1;
          expect(this.realm.objects(WithCounterSchema.name).length).equals(expectedNumObjects);
          expectCounter(counter);
          console.log({ initial: initialValuesList[i], counter: counter.value });
          expect(counter.value).equals(input);
        }
      });

      it("can create and access (input: Counter)", function (this: RealmContext) {
        const initialNumValues = initialValuesList;
        const initialCounterValues: Counter[] = [];

        // First create Realm objects with counters.
        this.realm.write(() => {
          for (const input of initialNumValues) {
            const { counter } = this.realm.create<IWithCounter>(WithCounterSchema.name, {
              counter: input,
            });
            expectCounter(counter);
            expect(counter.value).equals(input);

            initialCounterValues.push(counter);
          }
        });

        // Use the managed Counters as input, each in a separate transaction.
        for (let i = 0; i < initialCounterValues.length; i++) {
          const input = initialCounterValues[i];
          console.log({ input: input instanceof Counter });
          const { counter } = this.realm.write(() => {
            return this.realm.create<IWithCounter>(WithCounterSchema.name, {
              counter: input,
            });
          });

          const expectedNumObjects = initialNumValues.length + i + 1;
          expect(this.realm.objects(WithCounterSchema.name).length).equals(expectedNumObjects);
          expectCounter(counter);
          expect(counter.value).equals(input.value);
        }
      });

      it("can create and access (input: default value)", function (this: RealmContext) {
        const { counterWithDefault } = this.realm.write(() => {
          // Pass an empty object in order to use the default value from the schema.
          return this.realm.create<IWithOptAndDefaultCounter>(WithOptAndDefaultCounterSchema.name, {});
        });

        expect(this.realm.objects(WithOptAndDefaultCounterSchema.name).length).equals(1);
        expectCounter(counterWithDefault);
        expect(counterWithDefault.value).equals(0);
      });

      it("can create optional counter with int or null", function (this: RealmContext) {
        const { counter1, counter2 } = this.realm.write(() => {
          const counter1 = this.realm.create<IWithOptAndDefaultCounter>(WithOptAndDefaultCounterSchema.name, {
            optionalCounter: 0,
          }).optionalCounter;

          const counter2 = this.realm.create<IWithOptAndDefaultCounter>(WithOptAndDefaultCounterSchema.name, {
            optionalCounter: null,
          }).optionalCounter;

          return { counter1, counter2 };
        });

        expect(this.realm.objects(WithOptAndDefaultCounterSchema.name).length).equals(2);
        expectCounter(counter1);
        expect(counter1.value).equals(0);
        expect(counter2).to.be.null;
      });
    });
  });
});

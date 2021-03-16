/**
 * This file is part of agora-gui-booth.
 * Copyright (C) 2015-2016  Agora Voting SL <agora@agoravoting.com>

 * agora-gui-booth is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.

 * agora-gui-booth  is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with agora-gui-booth.  If not, see <http://www.gnu.org/licenses/>.
**/

/*
 * AnswerEncodeService unit tests
 * 
 */
/* jshint ignore:start */
describe(
  "MixedRadixService tests", 
  function () 
  {
    beforeEach(module("avCrypto"));

    beforeEach(
      inject(
        function (
          _MixedRadixService_, 
          _DeterministicJsonStringifyService_,
          _BigIntService_
        ) {
          mixedRadix = _MixedRadixService_;
          stringify = _DeterministicJsonStringifyService_;
          BigInt = _BigIntService_;
        }
      )
    );

    function stringifyBigInt(obj) 
    {
      if (Array.isArray(obj)) {
        var serialized = [];
        for(i = 0; i < obj.length; i++) {
          serialized.push(stringifyBigInt(obj[i]));
        }
        return "[" + serialized.join(",") + "]";
      } else if (typeof(obj) === 'object' && obj.toString && typeof(obj.toString) === 'function') {
        return obj.toString();
      } else {
        return stringify(obj);
      }
    }

    it(
      "mixedRadix.encode 1 ",
      function ()
      {
        expect(
          mixedRadix.encode(
            /*valueList = */ [
              new BigInt("29", 10),
              new BigInt("23", 10),
              new BigInt("59", 10)
            ],
            /*baseList = */ [
              new BigInt("30", 10),
              new BigInt("24", 10),
              new BigInt("60", 10)
            ]
          ).compareTo(
            new BigInt("" + ((29*24 + 23)*60 + 59), 10) // = 43199
          )
        )
        .toBe(0);
      }
    );

    it(
      "mixedRadix.encode 2 ",
      function ()
      {
        expect(
          mixedRadix.encode(
            /*valueList = */ [
              new BigInt("10", 10),
              new BigInt("10", 10),
              new BigInt("10", 10)
            ],
            /*baseList = */ [
              new BigInt("30", 10),
              new BigInt("24", 10),
              new BigInt("60", 10)
            ]
          ).compareTo(
            new BigInt("" + ((10*24 + 10)*60 + 10), 10) // = 15010
          )
        )
        .toBe(0);
      }
    );

    it(
      "mixedRadix.encode 3 ",
      function ()
      {
        expect(
          mixedRadix.encode(
            /*valueList = */ [
              new BigInt("21", 10),
              new BigInt("10", 10),
              new BigInt("11", 10)
            ],
            /*baseList = */ [
              new BigInt("30", 10),
              new BigInt("24", 10),
              new BigInt("60", 10)
            ]
          ).compareTo(
            new BigInt("30851", 10) // = (21*24 + 10)*60 + 11 = 30851
          )
        )
        .toBe(0);
      }
    );

    it(
      "mixedRadix.decode 1 ",
      function ()
      {
        expect(
          stringifyBigInt(
            mixedRadix.decode(
              /*baseList = */ [
                new BigInt("30", 10),
                new BigInt("24", 10),
                new BigInt("60", 10)
              ],
              /* encodedValue = */new BigInt("43199", 10)  // = (29*24 + 23)*60 + 59
            )
          )
        )
        .toBe(stringifyBigInt([29, 23, 59]));
      }
    );

    it(
      "mixedRadix.decode 2 ",
      function ()
      {
        expect(
          stringifyBigInt(
            mixedRadix.decode(
              /*baseList = */ [
                new BigInt("30", 10),
                new BigInt("24", 10),
                new BigInt("60", 10)
              ],
              /* encodedValue = */new BigInt("" + ((10*24 + 10)*60 + 10), 10)  // = 15010
            )
          )
        )
        .toBe(stringifyBigInt([10, 10, 10]));
      }
    );

    it(
      "mixedRadix.decode 3 ",
      function ()
      {
        expect(
          stringifyBigInt(
            mixedRadix.decode(
              /*baseList = */ [
                new BigInt("30", 10),
                new BigInt("24", 10),
                new BigInt("60", 10)
              ],
              /* encodedValue = */new BigInt("30851", 10)  // = (21*24 + 10)*60 + 11
            )
          )
        )
        .toBe(stringifyBigInt([21, 10, 11]));
      }
    );

    it(
      "mixedRadix.(encode then decode)",
      function ()
      {
        var examples = [
          {
            valueList: [
              new BigInt("21", 10),
              new BigInt("10", 10),
              new BigInt("11", 10)
            ],
            baseList: [
              new BigInt("30", 10),
              new BigInt("24", 10),
              new BigInt("60", 10)
            ]
          },
          {
            valueList: [
              new BigInt("3", 10),
              new BigInt("2", 10),
              new BigInt("1", 10)
            ],
            baseList: [
              new BigInt("5", 10),
              new BigInt("10", 10),
              new BigInt("10", 10)
            ]
          },
          {
            valueList: [
              new BigInt("1", 10),
              new BigInt("0", 10),
              new BigInt("2", 10),
              new BigInt("2", 10),
              new BigInt("128", 10),
              new BigInt("125", 10),
              new BigInt("0", 10),
              new BigInt("0", 10),
            ],
            baseList: [
              new BigInt("3", 10),
              new BigInt("3", 10),
              new BigInt("3", 10),
              new BigInt("3", 10),
              new BigInt("256", 10),
              new BigInt("256", 10),
              new BigInt("256", 10),
              new BigInt("256", 10)
            ]
          },
          {
            valueList: [
              new BigInt("0", 10),
              new BigInt("1", 10),
              new BigInt("2", 10),
              new BigInt("0", 10),
            ],
            baseList: [
              new BigInt("3", 10),
              new BigInt("3", 10),
              new BigInt("3", 10),
              new BigInt("3", 10),
            ]
          }
        ];

        for (var index = 0; index < examples.length; index++)
        {
          var example = examples[index];
          expect(
            stringifyBigInt(
              mixedRadix.decode(
                /* baseList = */ example.baseList,
                /* encodedValue = */ mixedRadix.encode(
                  /* valueList = */ example.valueList,
                  /* baseList = */ example.baseList
                )
              )
            )
          )
          .toBe(stringifyBigInt(example.valueList));
        }
      }
    );
  }
);

/* jshint ignore:end */

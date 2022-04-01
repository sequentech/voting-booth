/**
 * This file is part of voting-booth.
 * Copyright (C) 2015-2016  Sequent Tech Inc <legal@sequentech.io>

 * voting-booth is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.

 * voting-booth  is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with voting-booth.  If not, see <http://www.gnu.org/licenses/>.
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

    function toBigIntArray(intArray)
    {
      return _.map(
        intArray,
        function (intValue)
        {
          return new BigInt("" + intValue, 10);
        }
      );
    }

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
            [
              new BigInt("29", 10),
              new BigInt("23", 10),
              new BigInt("59", 10)
            ],
            [
              new BigInt("30", 10),
              new BigInt("24", 10),
              new BigInt("60", 10)
            ]
          ).compareTo(
            new BigInt("" + (29 + 30*(23 + 24*59)), 10) // = 43199
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
            [
              new BigInt("10", 10),
              new BigInt("10", 10),
              new BigInt("10", 10)
            ],
            [
              new BigInt("30", 10),
              new BigInt("24", 10),
              new BigInt("60", 10)
            ]
          ).compareTo(
            new BigInt("" + (10 + 30*(10 + 24*10)), 10) // = 7510
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
            [
              new BigInt("21", 10),
              new BigInt("10", 10),
              new BigInt("11", 10)
            ],
            [
              new BigInt("30", 10),
              new BigInt("24", 10),
              new BigInt("60", 10)
            ]
          ).compareTo(
            new BigInt("" + (21 + 30*(10 + 24*11)), 10) // = 8241
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
              [
                new BigInt("30", 10),
                new BigInt("24", 10),
                new BigInt("60", 10)
              ],
              new BigInt("43199", 10)  // = (29 + 30*(23 + 24*59))
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
              [
                new BigInt("30", 10),
                new BigInt("24", 10),
                new BigInt("60", 10)
              ],
              new BigInt("" + (10 + 30*(10 + 24*10)), 10) // = 7510
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
              [
                new BigInt("30", 10),
                new BigInt("24", 10),
                new BigInt("60", 10)
              ],
              new BigInt("8241", 10)  // = 21 + 30*(10 + 24*11)
            )
          )
        )
        .toBe(stringifyBigInt([21, 10, 11]));
      }
    );

    it(
      "mixedRadix.decode lastBase ",
      function ()
      {
        const encodedValue = 1 + 2*2*61 + 2*2*256*256*256*68;
        expect(
          stringifyBigInt(
            mixedRadix.decode(
              [
                new BigInt("2", 10),
                new BigInt("2", 10),
                new BigInt("256", 10)
              ],
              new BigInt(""+encodedValue, 10),
              new BigInt("256", 10)
            )
          )
        )
        .toBe(stringifyBigInt([1, 0, 61, 0, 0, 68]));
      }
    );

    it(
      "mixedRadix.decode large baseList ",
      function ()
      {
        const encodedValue = 1 + 2*2*61;
        expect(
          stringifyBigInt(
            mixedRadix.decode(
              [
                new BigInt("2", 10),
                new BigInt("2", 10),
                new BigInt("256", 10),
                new BigInt("256", 10),
                new BigInt("256", 10),
                new BigInt("256", 10),
                new BigInt("256", 10)
              ],
              new BigInt(""+encodedValue, 10),
              new BigInt("256", 10)
            )
          )
        )
        .toBe(stringifyBigInt([1, 0, 61, 0, 0, 0, 0]));
      }
    );

    it(
      "mixedRadix.(encode then decode) ",
      function ()
      {
        var examples = [
          {
            valueList: [21, 10, 11],
            baseList:  [30, 24, 60],
            encodedValue: "8241"
          },
          {
            valueList: [3, 2,  1 ],
            baseList:  [5, 10, 10],
            encodedValue: "63",
          },
          {
            valueList: [1, 0, 2, 2, 128, 125, 0,   0  ],
            baseList:  [3, 3, 3, 3, 256, 256, 256, 256],
            encodedValue: "2602441"
          },
          {
            valueList: [0, 1, 2, 0],
            baseList:  [3, 3, 3, 3],
            encodedValue: "21",
          },
          {
            valueList: [1, 0, 0,   0,   0,   0,   0  ],
            baseList:  [2, 2, 256, 256, 256, 256, 256],
            encodedValue: "1"
          },
          {
            valueList: [0, 1, 0, 0, 1, 0, 1, 69,],
            baseList:  [2, 2, 2, 2, 2, 2, 2, 256],
            encodedValue: "" + (0 + 2*(1 + 2*(0 + 2*(0 + 2*(1 + 2*(0+ 2*(1 + 2*(69))))))))
          },
          {
            valueList: [0, 1, 0, 0, 1, 0, 1, 69,  0,   0,   195, 132, 32,  98,  99,  0  ],
            baseList:  [2, 2, 2, 2, 2, 2, 2, 256, 256, 256, 256, 256, 256, 256, 256, 256],
            // Value calculated in python3 that uses by default big ints for
            // integers. The formula is:
            // (0 + 2*(1 + 2*(0 + 2*(0 + 2*(1 + 2*(0+ 2*(1 + 2*(69 + 256*(0 + 256*(0 + 256*(195 + 256*(132 + 256*(32 + 256*(98+ 256*99))))))))))))))
            encodedValue: "916649230342635397842"
          }
        ];

        for (var index = 0; index < examples.length; index++)
        {
          const example = examples[index];
          const encodedValue = mixedRadix.encode(
            toBigIntArray(example.valueList),
            toBigIntArray(example.baseList)
          );
          const decodedValue = stringifyBigInt(
            mixedRadix.decode(
              toBigIntArray(example.baseList),
              encodedValue
            )
          );

          expect(stringifyBigInt(encodedValue))
            .toBe(example.encodedValue);

          expect(decodedValue)
            .toBe(stringify(example.valueList));
        }
      }
    );
  }
);

/* jshint ignore:end */

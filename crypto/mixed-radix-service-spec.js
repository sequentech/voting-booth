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

    it(
      "mixedRadix.encode 1 ",
      function ()
      {
        expect(
          mixedRadix.encode(
            /*valueList = */ [29, 23, 59],
            /*baseList = */ [30, 24, 60]
          )
        )
        .toBe((29*24 + 23)*60 + 59); // = 43199
      }
    );

    it(
      "mixedRadix.encode 2 ",
      function ()
      {
        expect(
          mixedRadix.encode(
            /*valueList = */ [10, 10, 10],
            /*baseList = */ [30, 24, 60]
          )
        )
        .toBe((10*24 + 10)*60 + 10); // = 15010
      }
    );
    
    it(
      "mixedRadix.encode 3 ",
      function ()
      {
        expect(
          mixedRadix.encode(
            /*valueList = */ [21, 10, 11],
            /*baseList = */ [30, 24, 60]
          )
        )
        .toBe(30851); // (21*24 + 10)*60 + 11 = 30851
      }
    );

    it(
      "mixedRadix.decode 1 ",
      function ()
      {
        expect(
          stringify(
            mixedRadix.decode(
              /*baseList = */ [30, 24, 60],
              /* encodedValue = */43199  // = (29*24 + 23)*60 + 59
            )
          )
        )
        .toBe(stringify([29, 23, 59]));
      }
    );

    it(
      "mixedRadix.decode 2 ",
      function ()
      {
        expect(
          stringify(
            mixedRadix.decode(
              /*baseList = */ [30, 24, 60],
              /* encodedValue = */(10*24 + 10)*60 + 10 // = 15010
            )
          )
        )
        .toBe(stringify([10, 10, 10]));
      }
    );

    it(
      "mixedRadix.decode 2 ",
      function ()
      {
        expect(
          stringify(
            mixedRadix.decode(
              /*baseList = */ [30, 24, 60],
              /* encodedValue = */30851 // = (21*24 + 10)*60 + 11
            )
          )
        )
        .toBe(stringify([21, 10, 11]));
      }
    );

    it(
      "mixedRadix.(encode then decode)",
      function ()
      {
        var examples = [
          {
            valueList: [21, 10, 11],
            baseList: [30, 24, 60]
          },
          {
            valueList: [3, 2, 1],
            baseList: [5, 10, 10]
          },
          {
            valueList: [1, 0, 2, 2, 128, 125, 0, 0],
            baseList: [3, 3, 3, 3, 256, 256, 256, 256]
          },
          {
            valueList: [0, 1, 2, 0],
            baseList: [3, 3, 3, 3]
          }
        ];

        for (var index = 0; index < examples.length; index++)
        {
          var example = examples[index];
          expect(
            stringify(
              mixedRadix.decode(
                /* baseList = */ example.baseList,
                /* encodedValue = */ mixedRadix.encode(
                  /* valueList = */ example.valueList,
                  /* baseList = */ example.baseList
                )
              )
            )
          )
          .toBe(stringify(example.valueList));
        }
      }
    );
  }
);

/* jshint ignore:end */

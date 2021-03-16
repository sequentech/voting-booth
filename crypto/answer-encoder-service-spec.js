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
 * AnswerEncoderService unit tests
 * 
 */
/* jshint ignore:start */
describe(
  "AnswerEncoderService tests", 
  function () 
  {
    beforeEach(module("avCrypto"));

    beforeEach(
      inject(
        function (
          _AnswerEncoderService_, 
          _DeterministicJsonStringifyService_,
          _BigIntService_
        ) {
          answerEncoder = _AnswerEncoderService_;
          stringify = _DeterministicJsonStringifyService_;
          BigInt = _BigIntService_;
        }
      )
    );

    it(
      "AnswerEncoderService test", 
      function () 
      {
        var answer = [1, 5];
        var codec = answerEncoder("plurality-at-large", 7);
        expect(codec.sanityCheck()).toBe(true);
        
        var encoded = codec.encode(answer);
        var decoded = codec.decode(encoded);
        expect((stringify(decoded) == stringify(answer))).toBe(true);  
        
      }
    );

    /**
     * Mixed number encoding. It will encode using multiple different bases. The
     * number of bases and the number of values need to be equal.
     * 
     * @param {int[]} valueList List of positive integer number values to encode.
     * @param {int[]} baseList List of positive integer bases to use.
     */
    function mixedBaseEncode(valueList, baseList) 
    {
      // validate
      if (valueList.length !== baseList.length) 
      {
        throw new Error(
          "Invalid parameters: 'valueList' and 'baseList' must have the same " + 
          "length."
        );
      }

      // Encode
      var baseAccumulator = 1;

      return baseList.reduceRight(
        function (accumulator, base, index) 
        {
          const ret = accumulator + (baseAccumulator * valueList[index]);
          baseAccumulator = baseAccumulator * base;

          return ret;
        },
        0
      );
    }

    it(
      "mixedBaseEncoding 1 ",
      function ()
      {
        expect(
          mixedBaseEncode(
            /*valueList = */ [29, 23, 59],
            /*baseList = */ [30, 24, 60]
          )
        )
        .toBe((29*24 + 23)*60 + 59); // 43199
      }
    );

    it(
      "mixedBaseEncoding 2 ",
      function ()
      {
        expect(
          mixedBaseEncode(
            /*valueList = */ [10, 10, 10],
            /*baseList = */ [30, 24, 60]
          )
        )
        .toBe((10*24 + 10)*60 + 10); // 15010
      }
    );
    
    it(
      "mixedBaseEncoding 3 ",
      function ()
      {
        expect(
          mixedBaseEncode(
            /*valueList = */ [21, 10, 11],
            /*baseList = */ [30, 24, 60]
          )
        )
        .toBe(30851); // (21*24 + 10)*60 + 11 = 30851
      }
    );
  }
);

/* jshint ignore:end */

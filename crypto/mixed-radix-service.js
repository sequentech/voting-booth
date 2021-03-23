/**
 * This file is part of agora-gui-booth.
 * Copyright (C) 2021 Agora Voting SL <agora@agoravoting.com>

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

/**
 * Implements mixed radix encoding and decoding with BigInt numbers. 
 * Returns an object with two elements, 'encode' and 'decode', which are the
 * two functions defined and described below.
 */
angular
  .module('avCrypto')
  .service(
    'MixedRadixService',
    function(BigIntService) 
    {
      var BigInt = BigIntService;
      /**
       * Mixed number encoding. It will encode using multiple different bases. The
       * number of bases and the number of values need to be equal.
       * 
       * @param {BigInt[]} valueList List of positive integer number values to encode.
       * @param {BigInt[]} baseList List of positive integer bases to use.
       */
      function encoder(valueList, baseList) 
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
        var encodedValue = new BigInt("0");
  
        for (var index = valueList.length - 1; index >= 0; index--)
        {
          encodedValue = encodedValue
            .multiply(baseList[index])
            .add(valueList[index]);
        }
        return encodedValue;
      }
  
      /**
        * Mixed number decoding. It will decode using multiple different bases.
        * 
        * @param {BigInt[]} baseList     List of positive integer bases to use.
        * @param {BigInt}   lastBase     Base to use if baseList is too short.
        * @param {BigInt}   encodedValue Integer value to decode.
        * 
        * @return List of positive BigInt values.
        */
        function decoder(baseList, encodedValue, lastBase) 
        {
          var decodedValues = [];
          var accumulator = encodedValue.clone();
          var zero = new BigInt("0", 10);
          var index = 0;
    
          while (accumulator.compareTo(zero) > 0)
          {
            const base = (index < baseList.length)
              ? baseList[index]
              : lastBase;

            decodedValues.push(accumulator.remainder(base));
            accumulator = accumulator.divide(base);
            index += 1;
          }

          // If we didn't run all the bases, fill the rest with zeros
          for (; index < baseList.length; index++)
          {
            decodedValues.push(zero.clone());
          }

          return decodedValues;
        }
        return {
          "encode": encoder,
          "decode": decoder
        };
      }
    );

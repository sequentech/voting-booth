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
 * Encodes/Decodes the answer to a question given the question type.
 *
 * The encoder function always receives answer as a list of answer ids.
 *
 * Usage:
 *   var codec = AnswerEncoderService(question);
 *   assert(codec.sanityCheck()).toBe(true);
 *   var encoded = codec.encode([1, 5]);
 *   var decoded = codec.decode(encoded);
 *   assert(DeterministicJsonStringifyService(decoded) ==
 *          DeterministicJsonStringifyService([1, 5])).toBe(true);
 */

angular
  .module('avCrypto')
  .service(
    'AnswerEncoderService', 
    function(DeterministicJsonStringifyService) 
    {
      var stringify = DeterministicJsonStringifyService;

      /**
       * Converts a number to a string. For example if number=23 and 
       * numCharts=3, result="023"
       */
      function numberToString(number, numChars) 
      {
        var numStr = number.toString(10);
        var ret = numStr;
        for (var i = 0; i < numChars - numStr.length; i++) 
        {
          ret = "0" + ret;
        }
        return ret;
      }

      /**
       * @returns true if the url with the specific title and url appears in the
       * urls list.
       */
      function hasUrl(urls, title, url)
      {
        const url = _.find(
          urls,
          function(urlObject) 
          {
            return urlObject.title === title && urlObject.url === url;
          }
        );
        if (url) {
          return true;
        }
        return false;
      }

      // source https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
      // Marshals a string to an Uint8Array.
      function encodeUTF8(s) {
        var i = 0, bytes = new Uint8Array(s.length * 4);
        for (var ci = 0; ci != s.length; ci++) {
          var c = s.charCodeAt(ci);
          if (c < 128) {
            bytes[i++] = c;
            continue;
          }
          if (c < 2048) {
            bytes[i++] = c >> 6 | 192;
          } else {
            if (c > 0xd7ff && c < 0xdc00) {
              if (++ci >= s.length)
                throw new Error('UTF-8 encode: incomplete surrogate pair');
              var c2 = s.charCodeAt(ci);
              if (c2 < 0xdc00 || c2 > 0xdfff)
                throw new Error('UTF-8 encode: second surrogate character 0x' + c2.toString(16) + ' at index ' + ci + ' out of range');
              c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
              bytes[i++] = c >> 18 | 240;
              bytes[i++] = c >> 12 & 63 | 128;
            } else bytes[i++] = c >> 12 | 224;
            bytes[i++] = c >> 6 & 63 | 128;
          }
          bytes[i++] = c & 63 | 128;
        }
        return bytes.subarray(0, i);
      }

      // Unmarshals a string from an Uint8Array.
      function decodeUTF8(bytes) {
        var i = 0, s = '';
        while (i < bytes.length) {
          var c = bytes[i++];
          if (c > 127) {
            if (c > 191 && c < 224) {
              if (i >= bytes.length)
                throw new Error('UTF-8 decode: incomplete 2-byte sequence');
              c = (c & 31) << 6 | bytes[i++] & 63;
            } else if (c > 223 && c < 240) {
              if (i + 1 >= bytes.length)
                throw new Error('UTF-8 decode: incomplete 3-byte sequence');
              c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
            } else if (c > 239 && c < 248) {
              if (i + 2 >= bytes.length)
                throw new Error('UTF-8 decode: incomplete 4-byte sequence');
              c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
            } else throw new Error('UTF-8 decode: unknown multibyte start 0x' + c.toString(16) + ' at index ' + (i - 1));
          }
          if (c <= 0xffff) s += String.fromCharCode(c);
          else if (c <= 0x10ffff) {
            c -= 0x10000;
            s += String.fromCharCode(c >> 10 | 0xd800)
            s += String.fromCharCode(c & 0x3FF | 0xdc00)
          } else throw new Error('UTF-8 decode: code point 0x' + c.toString(16) + ' exceeds UTF-16 reach');
        }
        return s;
      }

      return function (question) 
      {
        const requestedCodec = question.tally_type;
        const numAvailableOptions = question.answers.length;
        var multi = {
          validCodecs: [
            "plurality-at-large", 
            "borda-nauru", 
            "borda", 
            "desborda3", 
            "desborda2", 
            "desborda", 
            "borda-mas-madrid",
            "cumulative"
          ],
          numAvailableOptions: numAvailableOptions,
          question: angular.copy(question),

          /**
           * Converts a raw ballot into an encoded number ready to be encrypted. 
           * A raw ballot is a list of positive integer numbers representing
           * the ballot, and can be obtained calling to `this.encodeRawBallot()`.
           *
           * Encoding is done using mixed radix encoding. The bases are 
           * automatically calculated when instancing this object. The bases 
           * used are either the number of points assigned to each answer or the
           * position in which that answer was selected for preferential 
           * elections. Please refer to mixed radix documentation to understand
           * how it works or read https://en.wikipedia.org/wiki/Mixed_radix
           * 
           * # Basics
           * 
           * If in a `plurality-at-large` there are three candidates `A`, `B`,
           * and `C` with answer ids `0`, `1` and `2`, and the voter wants to
           * vote to candidates `A` and `C`, then his ballot (extracted with 
           * encodeRawBallot) will be  `v = [1, 0, 1]` and the ballot will be
           * encoded this way:
           * 
           * ```
           * encodedBallot = v[0] + v[1]*b[0] + v[2]*b[0]*b[1]
           * encodedBallot = v[0] + b[0]*(v[1] + b[1]*v[2])
           * encodedBallot = 1 + 2*(0 + 2 * 1) = 1 + 4*1 = 5
           * ```
           * 
           * And the bases are `b = [2, 2, 2]`. The reason the bases are 2 here
           * is because plurality-at-large is a non-preferential voting system
           * and each base is representing if the voter chose (then we use 
           * `v[x] = 1`) or not (then we use `v[x] = 0`), and the base is in 
           * this case max(v[x])+1`.
           * 
           * # Preferential systems
           * 
           * In a preferential system, the voter can choose a specific ordering.
           * If we reuse the previous example, the voter might have chosen for
           * the first choice in his ballot candidate `A`, and for his second
           * choice candidate `B`. Not choosing a candidate would be encoded as
           * value `0`, so choosing it as first position would be value `1` and
           * so on. If the voter can choose up to 3 candidates, then the base
           * would be `maxChoices+1 = 3+1 = 4`, and thus bases will be 
           * `b = [4, 4, 4]` and raw ballot would be `v = [1, 0, 2]` and the
           * encoded ballot would be calculated as:
           * 
           * ```
           * encodedBallot = v[0] + v[1]*b[1] + v[2]*b[1]*b[2]
           * encodedBallot = v[0] + b[0]*(v[1] + b[1]*v[2])
           * encodedBallot = 1 + 4*(0 + 4*2) = 1 + 16*2 = 33
           * ```
           * 
           * # Invalid Ballot Flag
           * 
           * What was outlined before is the basics, but actually it does not
           * work exactly like that. The first value (`v[0]`) in the raw ballot
           * does not really represent the vote for the first candidate answer,
           * but it's always a flag saying if the ballot was marked as invalid
           * or not by the voter. Note that this is not the only way to create
           * an invalid ballot. For example the voter could vote to more options
           * than allowed, and that would also be an invalid ballot.
           * 
           * We asumes the invalid ballot flag is represented in the question
           * as a answer inside `question.answers` and it is flagged  by having
           * an element in `answer.urls` as 
           * `{title: 'invalidVoteFlag', url: 'true'}`.
           * 
           * Using the last example of a preferential vote, the bases would not
           * be `b = [4, 4, 4]` but `b = [2, 4, 4, 4]` (the first base encodes
           * always the invalid flag, whose max value is 1 so the base is always
           * 2).
           * 
           * The raw ballot would not be `v = [1, 0, 2]` but (if the vote was
           * not marked as invalid) `v = [0, 1, 0, 2]` and thus the encoded
           * ballot would be calculated as:
           * 
           * ```
           * encodedBallot = v[0] + b[0]*(v[1] + b[1]*(v[2] + b[2]*v[3])
           * encodedBallot = 0 + 2*(1 + 4*(0 + 4*2)) = 2*1 + 2*4*4*2
           * encodedBallot = 2*1 + 32*2 = 66
           * ```
           * 
           * # Cumulative voting system
           * 
           * In a cumulative voting system, the voter would have a total number
           * of integer points to assign to candidates, and the voter can assign
           * them to the available candidates with a maximum number of options
           * that can be assigned to each candidate. 
           * 
           * For example, the voter might be able to assign up to 2 points to
           * each candidate and assign a total of 3 points. In practice, the
           * encoding is done in a very similar format as with preferential 
           * voting system. For each candidate, the value we assign is a number
           * that represents the points assigned to the candidate, and the base
           * used is the maximum number of assignable points plus one.
           * 
           * Retaking the previous example used for plurality-at-large and used
           * for a preferential voting system, if the voter can assign a 
           * maximum of 4 points, and he wants to assign 2 points to candidate
           * `A` and 2 points to candidate `C` and he didn't mark his ballot
           * as invalid, then his raw ballot would be `v = [0, 2, 0, 1]`, the
           * bases would be `b = [2, 5, 5, 5]` and the encoded ballot would be
           * calculated as:
           * 
           * ```
           * encodedBallot = v[0] + b[0]*(v[1] + b[1]*(v[2] + b[2]*v[3])
           * encodedBallot = 0 + 2*(2 + 5*(0 + 5*1)) = 2*2 + 2*5*5*1
           * encodedBallot = 2*2 + 50*1 = 54
           * ```
           * 
           * # Write-ins
           * 
           * This encoder supports write-ins. The idea of write-ins is that the
           * voter can choose candidates that are not in the preconfigured list
           * of candidates. The maximum number of write-ins allowed is 
           * calculated automatically by suppossing the voter tries to 
           * distribute his vote entirely just for write-in candidates, which
           * is usually `question.max`.
           * 
           * The vote for each write-in is encoded using the same procedure as
           * for normal candidates, in order and as if the write-ins were in
           * the list of candidates. It asumes all write-ins (even if not 
           * selected) are in the list of candidates and they are flagged as 
           * such simply by an element in `answer.urls` as
           * `{title: 'isWriteIn', url: 'true'}`.
           * 
           * For example in a plurality-at-large question example with three
           * candidates `A`, `B` and `C` where the voter can choose up to 2
           * candidates, if the voter wants to cast a valid ballot to his 2
           * write-ins, then the bases, the rawBallot and the encoded ballot 
           * would be:
           * 
           * ```
           * // bases
           * b = [2, 2, 2, 2, 2, 2]
           * // raw ballot
           * v = [0, 0, 0, 0, 1, 1]
           * encodedBallot = 1*2^4 + 1*2^5 = 48
           * ```
           * 
           * # Write-in names
           * 
           * Of course that's not where a vote with write-ins ends. If the voter
           * voted to the write-ins, we would also have to encode the free text
           * string of the name of the write-ins. This is done by converting the
           * text from UTF-8 to numeric bytes, and encoding each byte using 
           * 2^8 = 256 as a base. The separation between the different write-in
           * names is done using an empty byte (so `v[x] = 0`).
           * 
           * So if in our case the name of the voter's two write-ins is `D` and
           * `E`, and knowing that character D is encoded as number `68` and E
           * is `69`, then the bases, the rawBallot and the encoded ballot 
           * would be:
           * 
           * ```
           * // bases
           * b = [2, 2, 2, 2, 2, 2, 256, 256, 256, 256]
           * // raw ballot
           * v = [0, 0, 0, 0, 1, 1, 68,  0,   69,  0]
           * encodedBallot = 1*2^4 + 1*2^5 + 68*2^6 + 69*2^8 = 22064
           * ```
           */
          encode: function(answers)
          {
            var numChars = (this.numAvailableOptions + 2).toString(10).length;
            var encodedAnswer = _.reduceRight(
              answers, 
              function (memo, answerId) 
              {
                return numberToString(answerId + 1, numChars) + memo;
              },
              ""
            );

            // blank vote --> make it not count numAvailableOptions + 2;
            if (encodedAnswer.length === 0) 
            {
              encodedAnswer = numberToString(
                this.numAvailableOptions + 2,
                numChars
              );
            }
            return encodedAnswer;
          },

          /**
           * @returns the ballot choices and the bases to be used for encoding
           * as an object, for example something like:
           * 
           * ```
           * {
           *   rawBallot: [0, 0, 0, 0, 1, 1, 68,  0,   69,  0],
           *   bases: [2, 2, 2, 2, 2, 2, 256, 256, 256, 256]
           * }
           * ```
           *
           * Please read the description of the encode function for details on
           * the output format of the raw ballot.
           */
          encodeRawBallot: function() 
          {

            // sort answers by id
            var sortedAnswers = _.sortBy(
              this.question.answers, 
              function (option) 
              {
                return option.id;
              }
            );

            // First we separate the answers between:
            // - Invalid vote answer (if any)
            // - Write-ins (if any)
            // - Valid answers (normal answers + write-ins if any)
            const invalidVoteAnswer = _.find(
              sortedAnswers, 
              function (answer)
              {
                return hasUrl(answer.urls, 'invalidVoteFlag', 'true');
              }
            );
            const invalidVoteFlag = invalidVoteAnswer && (invalidVoteAnswer.selected > 0)
              ? 1 : 0;

            const writeInAnwsers = _.filter(
              sortedAnswers, 
              function (answer)
              {
                return hasUrl(answer.urls, 'isWriteIn', 'true');
              }
            );

            const validAnwsers = _.filter(
              sortedAnswers, 
              function (answer)
              {
                return (
                  !hasUrl(answer.urls, 'invalidVoteFlag', 'true')
                );
              }
            );

            // Calculate the maximum number of write-ins allowed. Basically it
            // is just `question.max +1 ` but only if 
            // `question.extra_options.allow_writeins` is set.
            const maxNumWriteIns = (
              this.question.extra_options && 
              this.question.extra_options.allow_writeins
            )
              ? this.question.max
              : 0;

            // Calculate the base for answers. It depends on the 
            // `question.tally_type`:
            // - plurality-at-large: base 2 (value can be either 0 o 1)
            // - 
            // - preferential (*bordas*): question.max + 1
            // - cummulative: question.max + 1
            var answerBase = (this.question.tally_type === "plurality-at-large") 
              ? answerBase = 2
              : answerBase = this.question.max + 1;

            // Set the initial bases and raw ballot. We will populate the rest
            // next.
            var bases = [2];
            var rawBallot = [invalidVoteFlag];

            // populate rawBallot and bases using the valid answers list
            var tally_type = this.question.tally_type;
            _.each(
              validAnwsers,
              function (answer)
              {
                if (tally_type === 'plurality-at-large')
                {
                  // We just flag if the candidate was selected or not with 1
                  // for selected and 0 otherwise
                  const answerValue = (
                    !angular.isDefined(answer.selected) ||
                    answer.selected === null ||
                    answer.selected === -1
                  )
                    ? 0 : 1;
                  rawBallot.push(answerValue);
                } 
                else 
                {
                  // we add 1 because the counting starts with 1, as zero means
                  // this answer was not voted / ranked
                  const answerValue = (
                    !angular.isDefined(answer.selected) ||
                    answer.selected === null
                  )
                    ? 0
                    : answer.selected + 1;
                  rawBallot.push(answerValue);
                }
                bases.push(answerBase);
              }
            );
            
            // Populate the bases and the rawBallot values with the write-ins 
            // if there's any. We will through each write-in (if any), and then 
            // encode the write-in answer.text string with UTF-8 and use for 
            // each byte a specific value with base 256 and end each write-in 
            // with a \0 byte. Note that even write-ins.
            _.each(
              writeInAnwsers,
              function (answer)
              {
                if (!answer.text || answer.text.length === 0) 
                {
                  bases.push(256);
                  rawBallot.push(0);
                  return;
                }

                const encodedText = encodeUTF8(answer.text);
                _.each(
                  encodedText,
                  function (textByte) 
                  {
                    bases.push(256);
                    rawBallot.push(textByte);
                  }
                );
                // end it with a zero
                bases.push(256);
                rawBallot.push(0);
              }
            );

            return {
              bases: bases,
              rawBallot: rawBallot
            };
          },

          /**
           * Does the opposite of `this.encodeRawBallot`.
           * 
           * @returns `this.questions` with the data from the raw ballot.
           */
          decodeRawBallot: function(rawVote) {},

          /**
           * Does exactly the reverse of of encode. It should be
           * such as the following statement is always true:
           *
           * ```
           * data == codec.decode(codec.encode(answer))
           * ```
           *
           * This function is very useful for sanity checks.
           */
          decode: function(encodedAnswer) 
          {
            var encodedStr = encodedAnswer;
            var length = encodedStr.length;
            var tabNumChars = (this.numAvailableOptions + 2).toString(10).length;
            var missingZeros = (tabNumChars - (length % tabNumChars)) % tabNumChars;
            var i;
            var decodedAnswer = [];

            // check if it's a blank vote
            if (parseInt(encodedStr, 10) === this.numAvailableOptions + 2) 
            {
              return [];
            }

            // add zeros to the left for tabulation
            for (i = 0; i < missingZeros; i++) 
            {
              encodedStr = "0" + encodedStr;
            }

            // decode each option
            for (i = 0; i < (encodedStr.length / tabNumChars); i++) 
            {
              var optionStr = encodedStr.substr(i*tabNumChars, tabNumChars);
              var optionId = parseInt(optionStr, 10);
              decodedAnswer.push(optionId - 1);
            }
            return decodedAnswer;
          },

          // question is optional
          sanityCheck: function() 
          {
            try {
              var possibleAnswers = _.times(
                this.numAvailableOptions, 
                function(n) 
                {
                  return n + 1;
                }
              );

              if (question !== undefined)
              {
                possibleAnswers = _.pluck(this.question.answers, "id");
              }

              // TODO do a test with specific input and output values

              // test 10 random ballots. Note, we won't honor the limits of number
              // of options for this question for simplicity, we'll just do some
              // tests to assure everything is fine.
              for (var i = 0; i < 10; i++) 
              {
                // generate answer
                var answer = [];
                var randomNumOptions = Math.ceil(Math.random() * 10000) % possibleAnswers.length;
                for (var j = 0; j < randomNumOptions; j++) 
                {
                  var rnd = Math.ceil(Math.random() * 10000) % possibleAnswers.length;
                  var opt = possibleAnswers[rnd];
                  // do not duplicate options
                  if (_.indexOf(answer, opt) === -1) 
                  {
                    answer.push(opt);
                  }
                }
                // check encode -> decode pipe doesn't modify the ballot
                var encodedAnswer = multi.encode(answer);
                var decodedAnswer = stringify(multi.decode(encodedAnswer));
                if (stringify(answer) !== decodedAnswer) 
                {
                  return false;
                }
              }

              // test blank vote
              var encoded = multi.encode([]);
              var decoded = stringify(multi.decode(encoded));
              if (stringify([]) !== decoded)
              {
                return false;
              }
            // if any any exception is thrown --> sanity check didnt pass
            }
            catch (e) 
            {
              return false;
            }

            // if everything whent right
            return true;
          }
        };

        var pairwise = _.extend(
          _.clone(multi), 
          {
            validCodecs: ["pairwise-beta"],

            /**
             * Returns extracted answers from a question.
             *
             * The question objects needs to have an "answers" key, and each
             * selected asnwer will be marked by a "selected" attribute. We will
             * order by this attribute, and return an ordered array with all the
             * answers' ids. An answer id is set by its "id" attribute.
             */
             encodeRawBallot: function() 
            {
              // get the selected sorted options as a list of int ids
              var answers = _.pluck(_.flatten(this.question.selection), "id");

              if (
                answers.length > this.question.max*2 ||
                answers.length < this.question.min*2
              ) {
                throw "error in the number of selected answers";
              }

              return answers;
            }
          }
        );

        var codecs = [multi, pairwise];

        var foundCodec = _.find(
          codecs, 
          function (codec) 
          {
            return _.contains(codec.validCodecs, requestedCodec);
          }
        );

        if (!foundCodec) 
        {
          throw "unknown answer encoding service requested: " + requestedCodec;
        }

        return foundCodec;
      };
    })
  ;

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

    beforeEach(
      inject(
        function (
          _AnswerEncoderService_, 
          _DeterministicJsonStringifyService_
        ) {
          answerEncoder = _AnswerEncoderService_;
          stringify = _DeterministicJsonStringifyService_;
        }
      )
    );


    it(
      "AnswerEncoderService getBases ", 
      function () 
      {
        // The question contains the minimum data required for the encoder to work
        const data_list = [
          {
            question:{
              tally_type:"plurality-at-large",
              answers:[
                {id:0},
                {id:1,selected:0},
                {id:2},
                {id:3},
                {id:4},
                {id:5, selected:1},
                {id:6}
              ]
            },
            bases:[2, 2, 2, 2, 2, 2, 2, 2]
          },
          {
            question:{
              tally_type:"plurality-at-large",
              answers:[
                {id:0},
              ]
            },
            bases:[2, 2]
          },
          {
            question:{
              tally_type:"borda",
              max:1,
              answers:[
                {id:0},
              ]
            },
            bases:[2, 2]
          },
          {
            question:{
              tally_type:"borda",
              max:2,
              answers:[
                {id:0},
                {id:1},
                {id:2}
              ]
            },
            bases:[2, 3, 3, 3]
          },
        ]
        _.each(
          data_list,
          function(data)
          {
            const codec = answerEncoder(data["question"])
            expect(stringify(codec.getBases()))
              .toBe(stringify(data["bases"]));
          }
        );
      }
    );

    it(
      "AnswerEncoderService encodeRawBallot 1 ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "plurality-at-large",
          answers: [
            {id: 0},
            {id: 1, selected: 0},
            {id: 2},
            {id: 3},
            {id: 4},
            {id: 5, selected: 1},
            {id: 6}
          ]
        };
        var codec = answerEncoder(question);
        expect(codec.sanityCheck()).toBe(true);
        
        // check raw ballot getter
        const rawBallot = codec.encodeRawBallot();
        expect(stringify(rawBallot))
          .toBe(stringify({
            bases: [2, 2, 2, 2, 2, 2, 2, 2],
            choices:   [0, 0, 1, 0, 0, 0, 1, 0]
          }));
      }
    );

    it(
      "AnswerEncoderService encodeRawBallot 2 ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "plurality-at-large",
          answers: [
            {id: 0, selected: 0},
            {id: 1, selected: 0},
            {id: 2},
            {id: 3},
            {id: 4},
            {id: 5, selected: 0},
            {id: 6}
          ]
        };
        var codec = answerEncoder(question);
        expect(codec.sanityCheck()).toBe(true);
        
        // check raw ballot getter
        const rawBallot = codec.encodeRawBallot();
        expect(stringify(rawBallot))
          .toBe(stringify({
            bases: [2, 2, 2, 2, 2, 2, 2, 2],
            choices:   [0, 1, 1, 0, 0, 0, 1, 0]
          }));
      }
    );

    it(
      "AnswerEncoderService encodeRawBallot 3 ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "borda",
          max: 3,
          answers: [
            {id: 0, selected: 0},
            {id: 1, selected: 2},
            {id: 2},
            {id: 3},
            {id: 4},
            {id: 5, selected: 1},
            {id: 6}
          ]
        };
        var codec = answerEncoder(question);
        expect(codec.sanityCheck()).toBe(true);
        
        // check raw ballot getter
        const rawBallot = codec.encodeRawBallot();
        expect(stringify(rawBallot))
          .toBe(stringify({
            bases: [2, 4, 4, 4, 4, 4, 4, 4],
            choices:   [0, 1, 3, 0, 0, 0, 2, 0]
          }));
      }
    );

    it(
      "AnswerEncoderService encodeRawBallot invalid ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "plurality-at-large",
          answers: [
            {id: 0, selected: 1},
            {id: 1},
            {
              id: 2,
              selected: 1,
              urls: [{title: 'invalidVoteFlag', url: 'true'}]
            }
          ]
        };
        var codec = answerEncoder(question);
        expect(codec.sanityCheck()).toBe(true);
        
        // check raw ballot getter
        const rawBallot = codec.encodeRawBallot();
        expect(stringify(rawBallot))
          .toBe(stringify({
            bases: [2, 2, 2],
            choices:   [1, 1, 0]
          }));
      }
    );

    it(
      "AnswerEncoderService encodeRawBallot write-ins 1 ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "borda",
          max: 2,
          extra_options: {allow_writeins: true},
          answers: [
            {id: 0, selected: 0},
            {id: 1},
            {id: 2},
            {
              id: 3,
              selected: 0,
              urls: [{title: 'invalidVoteFlag', url: 'true'}]
            },
            {
              id: 4,
              text: 'D',
              selected: 1,
              urls: [{title: 'isWriteIn', url: 'true'}]
            },
            {
              id: 5,
              text: '',
              urls: [{title: 'isWriteIn', url: 'true'}]
            }
          ]
        };
        var codec = answerEncoder(question);
        expect(codec.sanityCheck()).toBe(true);
        
        // check raw ballot getter
        const rawBallot = codec.encodeRawBallot();
        expect(stringify(rawBallot))
          .toBe(stringify({
            bases:     [2, 3, 3, 3, 3, 3, 256, 256, 256],
            choices:   [1, 1, 0, 0, 2, 0, 68,  0,   0]
          }));
      }
    );

    it(
      "AnswerEncoderService encodeRawBallot write-ins 2 ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "plurality-at-large",
          extra_options: {allow_writeins: true},
          max: 3,
          answers: [
            {id: 0, selected: 1},
            {id: 1},
            {id: 2},
            {
              id: 3,
              urls: [{title: 'invalidVoteFlag', url: 'true'}]
            },
            {
              id: 4,
              text: 'E',
              selected: 1,
              urls: [{title: 'isWriteIn', url: 'true'}]
            },
            {
              id: 5,
              text: '',
              urls: [{title: 'isWriteIn', url: 'true'}]
            },
            {
              id: 6,
              selected: 1,
              text: 'Ä bc',
              urls: [{title: 'isWriteIn', url: 'true'}]
            }
          ]
        };
        var codec = answerEncoder(question);
        expect(codec.sanityCheck()).toBe(true);
        
        // check raw ballot getter
        const rawBallot = codec.encodeRawBallot();
        expect(stringify(rawBallot))
          .toBe(stringify({
            bases:     [2, 2, 2, 2, 2, 2, 2, 256, 256, 256, 256, 256, 256, 256, 256, 256],
            choices:   [0, 1, 0, 0, 1, 0, 1, 69,  0,   0,   195, 132, 32,  98,  99,  0]
          }));
      }
    );
    
    it(
      "AnswerEncoderService decodeRawBallot 1 ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "plurality-at-large",
          answers: [
            {id: 0},
            {id: 1},
            {id: 2},
            {id: 3},
            {id: 4},
            {id: 5},
            {id: 6}
          ]
        };
        var codec = answerEncoder(question);
        
        var decodedBallot = codec.decodeRawBallot({
          bases: [2, 2, 2, 2, 2, 2, 2, 2],
          choices:   [0, 0, 1, 0, 0, 0, 1, 0]
        });
        expect(stringify(decodedBallot))
          .toBe(stringify({
            tally_type: "plurality-at-large",
            answers: [
              {id: 0, selected: -1},
              {id: 1, selected: 0 },
              {id: 2, selected: -1},
              {id: 3, selected: -1},
              {id: 4, selected: -1},
              {id: 5, selected: 0 },
              {id: 6, selected: -1}
            ]
          }));
      }
    );

    it(
      "AnswerEncoderService decodeRawBallot 2 ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "plurality-at-large",
          answers: [
            {id: 0},
            {id: 1},
            {id: 2},
            {id: 3},
            {id: 4},
            {id: 5},
            {id: 6}
          ]
        };
        var codec = answerEncoder(question);
        
        var decodedBallot = codec.decodeRawBallot({
          bases: [2, 2, 2, 2, 2, 2, 2, 2],
          choices:   [0, 1, 1, 0, 0, 0, 1, 0]
        });
        expect(stringify(decodedBallot))
          .toBe(stringify({
            tally_type: "plurality-at-large",
            answers: [
              {id: 0, selected: 0 },
              {id: 1, selected: 0 },
              {id: 2, selected: -1},
              {id: 3, selected: -1},
              {id: 4, selected: -1},
              {id: 5, selected: 0 },
              {id: 6, selected: -1}
            ]
          }));
      }
    );

    it(
      "AnswerEncoderService decodeRawBallot 3 ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "borda",
          max: 3,
          answers: [
            {id: 0},
            {id: 1},
            {id: 2},
            {id: 3},
            {id: 4},
            {id: 5},
            {id: 6}
          ]
        };
        var codec = answerEncoder(question);

        var decodedBallot = codec.decodeRawBallot({
          bases:   [2, 4, 4, 4, 4, 4, 4, 4],
          choices: [0, 1, 3, 0, 0, 0, 2, 0]
        });
        expect(stringify(decodedBallot))
          .toBe(stringify({
            tally_type: "borda",
            max: 3,
            answers: [
              {id: 0, selected: 0 },
              {id: 1, selected: 2 },
              {id: 2, selected: -1},
              {id: 3, selected: -1},
              {id: 4, selected: -1},
              {id: 5, selected: 1 },
              {id: 6, selected: -1}
            ]
          }));
      }
    );

    it(
      "AnswerEncoderService decodeRawBallot invalid ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "plurality-at-large",
          answers: [
            {id: 0},
            {id: 1},
            {
              id: 2,
              urls: [{title: 'invalidVoteFlag', url: 'true'}]
            }
          ]
        };
        var codec = answerEncoder(question);

        var decodedBallot = codec.decodeRawBallot({
          bases: [2, 2, 2],
          choices:   [1, 1, 0]
        });
        expect(stringify(decodedBallot))
          .toBe(stringify({
            tally_type: "plurality-at-large",
            answers: [
              {id: 0, selected: 0},
              {id: 1, selected: -1},
              {
                id: 2,
                selected: 0,
                urls: [{title: 'invalidVoteFlag', url: 'true'}]
              }
            ]
          }));
      }
    );

    it(
      "AnswerEncoderService decodeRawBallot write-ins 1 ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "borda",
          max: 2,
          extra_options: {allow_writeins: true},
          answers: [
            {id: 0},
            {id: 1},
            {id: 2},
            {
              id: 3,
              urls: [{title: 'invalidVoteFlag', url: 'true'}]
            },
            {
              id: 4,
              urls: [{title: 'isWriteIn', url: 'true'}]
            },
            {
              id: 5,
              urls: [{title: 'isWriteIn', url: 'true'}]
            }
          ]
        };
        var codec = answerEncoder(question);

        var decodedBallot = codec.decodeRawBallot({
          bases:     [2, 3, 3, 3, 3, 3, 256, 256, 256],
          choices:   [1, 1, 0, 0, 2, 0, 68,  0,   0]
        });
        expect(stringify(decodedBallot))
          .toBe(stringify({
            tally_type: "borda",
            max: 2,
            extra_options: {allow_writeins: true},
            answers: [
              {id: 0, selected: 0 },
              {id: 1, selected: -1},
              {id: 2, selected: -1},
              {
                id: 3,
                selected: 0,
                urls: [{title: 'invalidVoteFlag', url: 'true'}]
              },
              {
                id: 4,
                text: 'D',
                selected: 1,
                urls: [{title: 'isWriteIn', url: 'true'}]
              },
              {
                id: 5,
                selected: -1,
                text: '',
                urls: [{title: 'isWriteIn', url: 'true'}]
              }
            ]
          }));
      }
    );

    it(
      "AnswerEncoderService decodeRawBallot write-ins 2 ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const question = {
          tally_type: "plurality-at-large",
          max: 3,
          extra_options: {allow_writeins: true},
          answers: [
            {id: 0},
            {id: 1},
            {id: 2},
            {
              id: 3,
              urls: [{title: 'invalidVoteFlag', url: 'true'}]
            },
            {
              id: 4,
              urls: [{title: 'isWriteIn', url: 'true'}]
            },
            {
              id: 5,
              urls: [{title: 'isWriteIn', url: 'true'}]
            },
            {
              id: 6,
              urls: [{title: 'isWriteIn', url: 'true'}]
            }
          ]
        };
        var codec = answerEncoder(question);

        var decodedBallot = codec.decodeRawBallot({
          bases:     [2, 2, 2, 2, 2, 2, 2, 256, 256, 256, 256, 256, 256, 256, 256, 256],
          choices:   [0, 1, 0, 0, 1, 0, 1, 69,  0,   0,   195, 132, 32,  98,  99,  0]
        });
        expect(stringify(decodedBallot))
          .toBe(stringify({
            tally_type: "plurality-at-large",
            max: 3,
            extra_options: {allow_writeins: true},
            answers: [
              {id: 0, selected: 0 },
              {id: 1, selected: -1},
              {id: 2, selected: -1},
              {
                id: 3,
                selected: -1,
                urls: [{title: 'invalidVoteFlag', url: 'true'}]
              },
              {
                id: 4,
                text: 'E',
                selected: 0,
                urls: [{title: 'isWriteIn', url: 'true'}]
              },
              {
                id: 5,
                selected: -1,
                text: '',
                urls: [{title: 'isWriteIn', url: 'true'}]
              },
              {
                id: 6,
                selected: 0,
                text: 'Ä bc',
                urls: [{title: 'isWriteIn', url: 'true'}]
              }
            ]
          }));
      }
    );

    it(
      "AnswerEncoderService full encoding test ", 
      function () 
      {
        const data = {
          question: {
            tally_type: "plurality-at-large",
            max: 3,
            extra_options: {allow_writeins: true},
            answers: [
              {id: 0},
              {id: 1},
              {id: 2},
              {
                id: 3,
                urls: [{title: 'invalidVoteFlag', url: 'true'}]
              },
              {
                id: 4,
                urls: [{title: 'isWriteIn', url: 'true'}]
              },
              {
                id: 5,
                urls: [{title: 'isWriteIn', url: 'true'}]
              },
              {
                id: 6,
                urls: [{title: 'isWriteIn', url: 'true'}]
              }
            ]
          },
          ballot: {
            tally_type: "plurality-at-large",
            max: 3,
            extra_options: {allow_writeins: true},
            answers: [
              {id: 0, selected: 0 },
              {id: 1, selected: -1},
              {id: 2, selected: -1},
              {
                id: 3,
                selected: -1,
                urls: [{title: 'invalidVoteFlag', url: 'true'}]
              },
              {
                id: 4,
                text: 'E',
                selected: 0,
                urls: [{title: 'isWriteIn', url: 'true'}]
              },
              {
                id: 5,
                selected: -1,
                text: '',
                urls: [{title: 'isWriteIn', url: 'true'}]
              },
              {
                id: 6,
                selected: 0,
                text: 'Ä bc',
                urls: [{title: 'isWriteIn', url: 'true'}]
              }
            ]
          },
          rawBallot: {
            bases:     [2, 2, 2, 2, 2, 2, 2, 256, 256, 256, 256, 256, 256, 256, 256, 256],
            choices:   [0, 1, 0, 0, 1, 0, 1, 69,  0,   0,   195, 132, 32,  98,  99,  0]
          },
          bigIntBallot: new BigInt("916649230342635397842", 10)
        };
        // 1. encode from ballot to rawBallot and test it
        var encoder = answerEncoder(data.ballot);
        expect(encoder.sanityCheck()).toBe(true);
        const rawBallot = encoder.encodeRawBallot();
        expect(stringify(rawBallot))
          .toBe(stringify(data.rawBallot));

        // 2. encode from rawBallot to BigInt and test it
        const bigIntBallot = encoder.encodeToBigInt(rawBallot);
        expect(stringifyBigInt(bigIntBallot))
          .toBe(stringifyBigInt(data.bigIntBallot));

        // 3. create a pristine encoder using the question without any selection 
        // set, and decode from BigInt to rawBallot and test it
        var decoder = answerEncoder(data.question);
        expect(decoder.sanityCheck()).toBe(true);
        const decodedRawBallot = decoder.decodeFromBigInt(data.bigIntBallot);
        expect(stringify(decodedRawBallot))
          .toBe(stringify(data.rawBallot));
        
        // 4. decode from raw ballot to ballot and test it
        const decodedBallot = decoder.decodeRawBallot(decodedRawBallot);
        expect(stringify(decodedBallot))
          .toBe(stringify(data.ballot));
      }
    );

    it(
      "AnswerEncoderService biggestEncodableNormalBallot ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const data = [
          {
            question: {
              tally_type: "plurality-at-large",
              answers: [
                {id: 0},
                {id: 1}
              ]
            },
            expectedValue: "7"
          },
          {
            question: {
              tally_type: "borda",
              max: 3,
              answers: [
                {id: 0},
                {id: 1},
                {id: 2}
              ]
            },
            expectedValue: "" + (1 + 3*2 + 3*2*4 + 3*2*4*4) // 127
          },
          {
            question: {
              tally_type: "plurality-at-large",
              max: 3,
              extra_options: {allow_writeins: true},
              answers: [
                {id: 0},
                {id: 1},
                {id: 2},
                {
                  id: 3,
                  urls: [{title: 'invalidVoteFlag', url: 'true'}]
                },
                {
                  id: 4,
                  urls: [{title: 'isWriteIn', url: 'true'}]
                },
                {
                  id: 5,
                  urls: [{title: 'isWriteIn', url: 'true'}]
                },
                {
                  id: 6,
                  urls: [{title: 'isWriteIn', url: 'true'}]
                }
              ]
            },
            // highestValueList = [1, 1, 1, 1, 1, 1, 1, 255, 255, 255]
            // bases =            [2, 2, 2, 2, 2, 2, 2, 256, 256, 256]
            // expectedValue = "" + (1 + 1*2 + 2**2 + 2**3 + 2**4 + 2**5 + 2**6 + 255*(2**7) + 255*(2**7)*256  + 255*(2**7)*(256**2)) = "2147483647"
            expectedValue: "2147483647"
          }
        ];

        for (var i = 0; i < data.length; i++)
        {
          const element = data[i];
          var codec = answerEncoder(element.question);
          expect(codec.sanityCheck()).toBe(true);
          
          // check the number of bytes left
          expect(
            stringifyBigInt(
              codec.biggestEncodableNormalBallot()
            )
          )
            .toBe(element.expectedValue);
        }
      }
    );

    it(
      "AnswerEncoderService numWriteInBytesLeft ", 
      function () 
      {
        // the question contains the minimum data required for the encoder to
        // work
        const data = [
          {
            question: {
              tally_type: 'plurality-at-large',
              answers: [
                {id: 0},
                {id: 1}
              ]
            },
            modulus: '111',
            bytesLeft: 'throws'
          },
          {
            question: {
              tally_type: 'plurality-at-large',
              max: 1,
              extra_options: {allow_writeins: true},
              answers: [
                {id: 0},
                {id: 1},
                {
                  id: 2,
                  urls: [{title: 'isWriteIn', url: 'true'}]
                }
              ]
            },
            //                bases  = [2, 2, 2, 2, 256]
            // biggest normal ballot = [1, 1, 1, 1, 255]
            // minimum encoded modulus for one byte free:
            //               modulus = {
            //                  value: [2, 2, 2, 2, 256, 256, 256]
            //                  value: [0, 0, 0, 0, 0,   0,   1  ]
            modulus: "" + (1*2*2*2*2*256*256), // 1048576
            bytesLeft: 0
          },
          {
            question: {
              tally_type: 'plurality-at-large',
              max: 1,
              extra_options: {allow_writeins: true},
              answers: [
                {id: 0},
                {id: 1},
                {
                  id: 2,
                  urls: [{title: 'isWriteIn', url: 'true'}]
                }
              ]
            },
            //                bases  = [2, 2, 2, 2, 256]
            // biggest normal ballot = [1, 1, 1, 1, 255]
            // minimum encoded modulus for one byte free:
            //               modulus = {
            //                  value: [2, 2, 2, 2, 256, 256, 256]
            //                  value: [0, 0, 0, 0, 0,   0,   1  ]
            modulus: "" + (1*2*2*2*2*256*256+1), // 1048577
            bytesLeft: 1
          },
          {
            question: {
              tally_type: 'plurality-at-large',
              max: 1,
              extra_options: {allow_writeins: true},
              answers: [
                {id: 0},
                {id: 1},
                {
                  id: 2,
                  urls: [{title: 'isWriteIn', url: 'true'}]
                }
              ]
            },
            //                bases  = [2, 2, 2, 2, 256]
            // biggest normal ballot = [1, 1, 1, 1, 255]
            // minimum encoded modulus for 2 bytes free:
            //               modulus = {
            //                  value: [2, 2, 2, 2, 256, 256, 256, 256]
            //                  value: [0, 0, 0, 0, 0,   0,   0,   1  ]
            modulus: "" + (1*2*2*2*2*256*256*256), // 268435456
            bytesLeft: 1
          },
          {
            question: {
              tally_type: 'plurality-at-large',
              max: 1,
              extra_options: {allow_writeins: true},
              answers: [
                {id: 0},
                {id: 1},
                {
                  id: 2,
                  urls: [{title: 'isWriteIn', url: 'true'}]
                }
              ]
            },
            //                bases  = [2, 2, 2, 2, 256]
            // biggest normal ballot = [1, 1, 1, 1, 255]
            // minimum encoded modulus for 2 bytes free:
            //               modulus = {
            //                  value: [2, 2, 2, 2, 256, 256, 256, 256]
            //                  value: [0, 0, 0, 0, 0,   0,   0,   1  ]
            modulus: "" + (1*2*2*2*2*256*256*256+1), // 268435457
            bytesLeft: 2
          },
        ];

        for (var i = 0; i < data.length; i++)
        {
          const element = data[i];
          var codec = answerEncoder(element.question);
          expect(codec.sanityCheck()).toBe(true);

          // check the number of bytes left
          if (element.bytesLeft === 'throws')
          {
            expect(
              function () 
              {
                return codec.numWriteInBytesLeft(
                  new BigInt(element.modulus, 10)
                )
              }
            ).toThrow();
          } 
          else
          {
            expect(
              codec.numWriteInBytesLeft(
                new BigInt(element.modulus, 10)
              )
            ).toBe(element.bytesLeft);
          }
        }
      }
    );
  }
);

/* jshint ignore:end */

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
  Encrypts an election ballot.

  While it does that, it send status updates via a callback function. It also
  provides success and error callbacks.

  This service is a function that receives an object.

  Usage:

      EncryptBallotService({
        election: election,
        pubkeys: pubkeys,
        statusUpdate: function () (status, options) { .. },
        success: function (encryptedBallot, auditableBallot) { },
        error: function (status, message) { },
        verify: true, // verify proofs. takes more time
        delay: 100,   // in milliseconds
      });

  The statusUpdate callback receives two arguments, status and options:
   - when status is "sanityChecks", options is an object with the
     "percentageCompleted" attribute. The statusUpdate callback is  called with
     this status before it starts executing the sanity checks.

   - when status is "encryptingQuestion", options is an object with
     "questionNum" and "percentageCompleted" attributes, both integers. The
     statusUpdate callback is called with this status before it starts
     encrypting the answers to a question.

   - when status is "verifyingQuestion", options is an object with
     "questionNum" and "percentageCompleted" attributes, both integers. The
     statusUpdate callback is called with this status after having encrypted the
     answers to a question and beofre it starts verifying that encrypted data.

  The success callback receives the encrypted ballot object and the auditable
  balot object.
  The error callback receives a status and a more detailed message.
  The verify attribute specifies if the service should verify the proof it
  generates. This takes more time, but gives extra security.
  If the input data does not validate, it might throw an exception string.

  encryptedBallot argument of the success callback follows the format below:
  {
    "choices":[
      {
        "alpha":"1",
        "beta":"3",
      }
    ],
    "issue_date":"07/11/2014",
    "proofs":[
      {
        "challenge":"1",
        "commitment":"2",
        "response": "3"
      }
    ]
  }

  auditableBallot argument of the success callback follows the format below:
  {
    "choices":[
      {
        "alpha":"1",
        "beta":"3",
        "randomness": "4",
        "plaintext": "5"
      }
    ],
    "issue_date":"07/11/2014",
    "pubkeys_url":"https://whatever",
    "ballot_hash":"whatever",
    "proofs":[
      {
        "challenge":"1",
        "commitment":"2",
        "response": "3"
      }
    ]
  }

*/

angular.module('avCrypto')
  .service('EncryptBallotService', function(
    ConfigService, 
    EncryptAnswerService,
    moment, 
    SjclService, 
    DeterministicJsonStringifyService, 
    AnswerEncoderService, 
    $timeout
  ) {
    var stringify = DeterministicJsonStringifyService;

    function hashObject(obj) {
      var objStr = stringify(obj);
      var hashBits = SjclService.hash.sha256.hash(objStr);
      return SjclService.codec.hex.fromBits(hashBits);
    }

    function getPlainText(question, verify) 
    {
      // encode the answers
      var codec = AnswerEncoderService(question);
      const rawBallot = codec.encodeRawBallot();
      const encoded = codec.encodeToBigInt(rawBallot);
      if (verify) 
      {
        const decodedRawBallot = codec.decodeFromBigInt(encoded);
        if (stringify(rawBallot) !== stringify(decodedRawBallot)) 
        {
          return null;
        }
      }
      return encoded.toString();
    }

    return function (data) {
      // minimally check input
      if (!angular.isObject(data)) 
      {
        throw "invalid input data, not an object";
      }
      if (!angular.isDefined(data.error) || !angular.isFunction(data.error)) 
      {
        throw "data.error is not a function";
      }
      if (!angular.isDefined(data.success) || !angular.isFunction(data.success)) 
      {
        data.error("invalidDataFormat", "data.success is not a function");
        return;
      }
      if (
        !angular.isDefined(data.statusUpdate) || 
        !angular.isFunction(data.statusUpdate)
      ) {
        data.error("invalidDataFormat", "data.statusUpdate is not a function");
        return;
      }
      if (!angular.isDefined(data.election) || !angular.isObject(data.election)) 
      {
        data.error("invalidDataFormat", "invalid data.election, not an object");
        return;
      }
      if (!angular.isDefined(data.pubkeys) || !angular.isArray(data.pubkeys)) 
      {
        data.error("invalidDataFormat", "invalid data.pubkeys, not an array");
        return;
      }
      if (!angular.isDefined(data.verify)) 
      {
        data.error("invalidDataFormat", "invalid data.verify");
        return;
      }
      // convert to bool for sure
      data.verify = !!data.verify;

      var numQuestions = data.election.questions.length;
      var qNum = 0;
      var answers = [];

      // used to calculate the percentage. If data.verify is true, each
      // iteration has two steps
      var iterationSteps = 1;
      if (data.verify) 
      {
        iterationSteps = 2;
      }

      data.statusUpdate("sanityChecks", {percentageCompleted: 0});

      // for each question, execute sanity check
      var sanitized = true;
      var questionIndex = 0;
      var question;
      var codec;
      var percent;
      try 
      {
        for (questionIndex = 0; questionIndex < numQuestions; questionIndex++) 
        {
          question = data.election.questions[questionIndex];
          codec = AnswerEncoderService(question);
          const q = data.pubkeys[questionIndex].q;
          if (!angular.isDefined(q) || !codec.sanityCheck(new BigInt(q, 10))) 
          {
            sanitized = false;
            break;
          }
        }
      }
      catch(e) 
      {
        sanitized = false;
      }

      if (!sanitized) 
      {
        data.error(
          "sanityChecksFailed", "we have detected errors when doing some " +
          "sanity automatic checks which prevents to assure that you can " +
          "vote with this web browser. This is most likely a problem with " +
          "your web browser.");
        return;
      }

      function formatBallot(election, answers) 
      {
        var ballot = {
          "proofs": [],
          "choices": [],
          "issue_date": moment().format("DD/MM/YYYY"),
        };
        
        for (var i = 0; i < election.questions.length; i++) 
        {
          var qAnswer = answers[i];
          ballot.proofs.push({
            "commitment": qAnswer['commitment'],
            "response": qAnswer['response'],
            "challenge": qAnswer['challenge']
          });
          ballot.choices.push({
            "alpha": qAnswer['alpha'],
            "beta": qAnswer['beta']
          });
        }
        return ballot;
      }

      function formatAuditableBallot(election, answers, electionState, pubkeys, isVirtual) 
      {
        var electionConfig = {
          id: election.id,
          configuration: election,
          state: electionState,
          pks: JSON.stringify(pubkeys),
          virtual: isVirtual,
        };
        var ballot = {
          "proofs": [],
          "choices": [],
          "issue_date": moment().format("DD/MM/YYYY"),
          //"election_url": ConfigService.baseUrl + "election/" + election.id
          "config": electionConfig
        };
        for (var i = 0; i < election.questions.length; i++) 
        {
          var qAnswer = answers[i];
          ballot.proofs.push({
            "commitment": qAnswer['commitment'],
            "response": qAnswer['response'],
            "challenge": qAnswer['challenge']
          });
          ballot.choices.push({
            "alpha": qAnswer['alpha'],
            "beta": qAnswer['beta'],
            "randomness": qAnswer['randomness'],
            "plaintext": qAnswer['plaintext']
          });
        }
        return ballot;
      }


      questionIndex = 0;
      // encrypt question one by one, with timeouts in the middle to give time
      // to other things (like browser ui) to update
      function encryptNextQuestion() 
      {
        if (questionIndex >= numQuestions) 
        {
          // ballot generated
          var ballot = formatBallot(data.election, answers);
          var auditData = formatAuditableBallot(
            data.election, answers, data.electionState, data.pubkeys, data.isVirtual);
          var ballotStr = stringify(ballot);

          // generate ballot hash
          var ballotHash = hashObject(ballot);
          auditData.ballot_hash = ballotHash;
          data.success(ballot, auditData);
          return;
        }

        // initialization
        question = data.election.questions[questionIndex];
        percent = Math.floor(
          (100*questionIndex*iterationSteps) / (numQuestions*iterationSteps));

        // hey, let's say to the user we have done something already, 5%
        // minimum right?
        if (percent < 5) 
        {
          percent = 5;
        }

        data.statusUpdate(
          "encryptingQuestion",
          {
            questionNum: questionIndex,
            percentageCompleted: percent
          }
        );

        // crypto time!

        var encryptor = EncryptAnswerService(data.pubkeys[questionIndex]);

        // we always verify plaintext just to be sure, because it takes very
        // little CPU time
        var plaintext = null;
        try 
        {
          plaintext = getPlainText(question, true);
        } 
        catch(e) 
        {
        }

        if (!plaintext) 
        {
          data.error(
            "errorEncoding", 
            "error while encoding the answer to a question"
          );
          return;
        }
        console.log("plaintext = " + plaintext);
        var hasEncryptionError = false;
        var logEncryptionError = function (name, description) 
        {
          data.error(name, description);
          hasEncryptionError = true;
        };
        
        var encryptedAnswer = encryptor.encryptAnswer(
          plaintext, 
          false, 
          false, 
          logEncryptionError
        );
        if (!!hasEncryptionError) 
        {
          return;
        }
        answers.push(encryptedAnswer);

        if (data.verify) 
        {
          // send status update
          percent = Math.floor(
            (100*questionIndex*iterationSteps + 1) / (numQuestions*iterationSteps));
          if (percent < 5) 
          {
            percent = 5;
          }
          data.statusUpdate(
            "verifyingQuestion",
            {
              questionNum: questionIndex,
              percentageCompleted: percent
            }
          );
          if (!encryptor.verifyPlaintextProof(encryptedAnswer)) 
          {
            data.error(
              "errorEncrypting", 
              "error while encrypting the answer to a question"
            );
            return;
          }
        }
        questionIndex += 1;
        $timeout(encryptNextQuestion, data.delay);
      }

      // launch first in the chain
      $timeout(encryptNextQuestion, data.delay);
    };
  });
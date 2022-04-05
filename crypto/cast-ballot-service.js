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
  Sends a ballot to the server.

  While it does that, it send status updates via a callback function. It also
  provides success and error callbacks.

  This service is a function that receives an object

  Tdhe statusUpdate callback receives two arguments, status and options:
   - when status is "sendingBallot", options is an object with
     "percentageCompleted", "ballotHash" and "ballot" attributes. The
     statusUpdate callback is called with this status before it starts sending
     the ballot to the server.

  The success callback receives the json result data from the server.
  The error callback receives a status and a more detailed message.
  The verify attribute specifies if the service should verify the proof it
  generates. This takes more time, but gives extra security.

  If the input data does not validate, it might throw an exception string.

  Usage:

      CastBallotService({
        encryptedBallot: encryptedBallot,
        statusUpdate: function () (status, options) { .. },
        success: function (resultData) { },
        error: function (status, message) {},
        authorizationHeader: "khmac:///sha-256;hash/voterid:action:vote:election:eid:timestamp",
        castBallotUrl: "https://example.com/api/v1/ballotbox/vote"
      });
*/

angular.module('avCrypto')
  .service('CastBallotService', function(ConfigService, EncryptAnswerService,
    moment, SjclService, DeterministicJsonStringifyService, ElGamalService,
    AnswerEncoderService, $timeout, $http)
  {
    return function (data) {
      // minimally check input
      if (!angular.isObject(data)) {
        throw "invalid input data, not an object";
      }
      if (!angular.isDefined(data.error) || !angular.isFunction(data.error)) {
        throw "data.error is not a function";
      }
      if (!angular.isDefined(data.encryptedBallot) || !angular.isObject(data.encryptedBallot)) {
        data.error("invalidDataFormat", "data.encryptedBallot is not  an object");
      }
      if (!angular.isDefined(data.success) || !angular.isFunction(data.success)) {
        data.error("invalidDataFormat", "data.success is not a function");
        return;
      }
      if (!angular.isDefined(data.statusUpdate) || !angular.isFunction(data.statusUpdate)) {
        data.error("invalidDataFormat", "data.statusUpdate is not a function");
        return;
      }

      var stringify = DeterministicJsonStringifyService;

      function hashObject(objStr) {
        var hashBits = SjclService.hash.sha256.hash(objStr);
        return SjclService.codec.hex.fromBits(hashBits);
      }

      // used to calculate the percentage. If data.verify is true, each
      // iteration has two steps
      var iterationSteps = 0;
      var ballotStr = stringify(data.encryptedBallot);
      var ballotHash = hashObject(ballotStr);

      data.statusUpdate(
        "sendingBallot",
        {
          ballotHash: ballotHash,
          ballot: angular.copy(data.encryptedBallot),
          percentageCompleted: 0.2
        }
      );

      $http.post(
        data.castBallotUrl,
        {
            vote: ballotStr,
            vote_hash: ballotHash
        },
        {headers: {Authorization: data.authorizationHeader}})
        .then(
          function onSuccess(response) {
            data.success(response.data);
          },
          function(response) {
            if (response.status === 401) {
              data.error("couldntSendBallotUnauthorized", stringify(response.data));
            } else if (response.status === 404 || response.status === 502) {
              data.error("couldntSendBallotNotFound", stringify(response.data));
            } else if (response.status === 400 && response.data.payload === 'Maximum number of revotes reached') {
              data.error("tooManyUserUpdates", stringify(response.data));
            } else if (response.status === 400 && response.data.payload === 'Election is not open') {
              data.error("errorSendingBallotElectionNotOpen", stringify(response.data));
            } else {
              data.error("couldntSendBallot", stringify(response.data));
            }
          }
        );
    };
  });
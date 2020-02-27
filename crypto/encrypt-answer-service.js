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
  usage:

    var encryptor = EncryptBallotService.init(pk);
    var ctext = encryptor.encryptAnswer(23, false, false, console.log);

  dependencies

  jsbn.js
  jsbn2.js
  bigint.js
  class.js
  elgamal.js
  random.js
  sha1.js
  sha2.js
  sjcl.js
*/

angular.module('avCrypto')
  .service('EncryptAnswerService', function(ElGamalService, BigIntService, RandomService, DeterministicJsonStringifyService) {
    return function (publicKeyJson) {
      // private members
      var publicKeyJsonCopy = publicKeyJson;
      var publicKey = ElGamalService.PublicKey.fromJSONObject(publicKeyJsonCopy);
      var proof2;

      // public interface
      return {

        // randomness argument is optional, used just for unit testing really
        encryptAnswer: function(plain_answer, randomness, randomness2, error_func) {
          var plaintext = new ElGamalService.Plaintext(
            BigIntService.fromJSONObject(plain_answer),
            publicKey,
            true);

          // checking that encoding a number to a member of the group and then
          // decoding it returns the same number. This will usually detect if
          // a number too big to encode in the group.
          //
          // Because the number coming from the group will never have a zero to
          // the left but the origin plain_answer might, we strip the zeros to
          // the left of plain_answer. We could convert them to BigInts both
          // and compare but seems overkill, and we cannot convert them to ints
          // because the numbers might be bigger than the max-safe-int in
          // javascript, so that's why are we still comparing them as strings.
          var plainAnswerDecoded = plaintext.getPlaintext();
          if (!!error_func &&
            (plainAnswerDecoded.toJSONObject()+"" !== plain_answer.replace(/^0+/, "")+""))
          {
            error_func("errorEncoding", "error while encoding the number to a member of the group");
          }
          if (!randomness) {
            randomness = RandomService.getRandomInteger(publicKey.q);
          } else {
            randomness = BigIntService.fromInt(randomness);
          }

          if (!randomness2) {
            randomness2 = RandomService.getRandomInteger(publicKey.q);
          } else {
            randomness2 = BigIntService.fromInt(randomness2);
          }

          var ctext = ElGamalService.encrypt(publicKey, plaintext, randomness);
          // obtains proof of plaintext knowledge (schnorr protocol)
          var proof = plaintext.proveKnowledge(
            ctext.alpha,
            randomness,
            ElGamalService.fiatshamir_dlog_challenge_generator,
            randomness2);
          var ciphertext =  ctext.toJSONObject();
          var jsonProof = proof.toJSONObject();
          var encAnswer = {
            alpha: ciphertext.alpha,
            beta: ciphertext.beta,
            commitment: jsonProof.commitment,
            response: jsonProof.response,
            challenge: jsonProof.challenge,
            randomness: randomness.toJSONObject(),
            plaintext: plain_answer
          };

          return encAnswer;
        },

        getPublicKey: function() {
          return publicKeyJson;
        },

        // verifies the proof of plaintext knowledge (schnorr protocol)
        verifyPlaintextProof: function(encrypted) {
          var ctext = new ElGamalService.Ciphertext(
            BigIntService.fromInt(encrypted.alpha),
            BigIntService.fromInt(encrypted.beta),
            publicKey);
          var proof = new ElGamalService.DLogProof(
            new ElGamalService.PlaintextCommitment(
              BigIntService.fromInt(encrypted.alpha),
              BigIntService.fromInt(encrypted.commitment)
            ),
            BigIntService.fromInt(encrypted.challenge),
            BigIntService.fromInt(encrypted.response));

          return ctext.verifyPlaintextProof(
            proof,
            ElGamalService.fiatshamir_dlog_challenge_generator);
        }
      };
    };
  });

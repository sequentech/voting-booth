/**
 * This file is part of voting-booth.
 * Copyright (C) 2015-2021  Sequent Tech Inc <legal@sequentech.io>

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
  usage:

    const encryptor = EncryptBallotService.init(public_key_json);
    const ctext = encryptor.encryptAnswer("23", false, false, console.log);

  dependencies:

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
  .service(
    'EncryptAnswerService', 
    function(
      ElGamalService, 
      BigIntService, 
      RandomService, 
      DeterministicJsonStringifyService
    ) 
    {
      return function (publicKeyJson) 
      {
        // private members
        const publicKeyJsonCopy = publicKeyJson;
        const publicKey = ElGamalService.PublicKey.fromJSONObject(publicKeyJsonCopy);

        // public interface
        return {
          // randomness argument is optional, used just for unit testing really
          encryptAnswer: function(
            plainAnswerStr, 
            randomness, 
            randomness2, 
            error_func
          ) {
            const plaintext = new ElGamalService.Plaintext(
              BigIntService.fromJSONObject(plainAnswerStr),
              publicKey,
              true
            );

            // checking that encoding a number to a member of the group and then
            // decoding it returns the same number. This will usually detect if
            // a number too big to encode in the group.
            //
            // Because the number coming from the group will never have a zero to
            // the left but the origin plainAnswer might, we strip the zeros to
            // the left of plainAnswer. We could convert them to BigInts both
            // and compare but seems overkill, and we cannot convert them to ints
            // because the numbers might be bigger than the max-safe-int in
            // javascript, so that's why are we still comparing them as strings.
            const plainAnswerDecoded = plaintext.getPlaintext();
            const plainAnswerDecodedStr = plainAnswerDecoded.toString();

            if (!!error_func && (plainAnswerDecodedStr !== plainAnswerStr)) 
            {
              error_func(
                "errorEncoding", 
                "error while encoding the number to a member of the group"
              );
            }

            if (!randomness) 
            {
              randomness = RandomService.getRandomInteger(publicKey.q);
            } else 
            {
              randomness = BigIntService.fromInt(randomness);
            }

            if (!randomness2) 
            {
              randomness2 = RandomService.getRandomInteger(publicKey.q);
            } else 
            {
              randomness2 = BigIntService.fromInt(randomness2);
            }

            const ctext = ElGamalService.encrypt(publicKey, plaintext, randomness);
            // obtains proof of plaintext knowledge (schnorr protocol)
            const proof = plaintext.proveKnowledge(
              ctext.alpha,
              randomness,
              ElGamalService.fiatshamir_dlog_challenge_generator,
              randomness2
            );
            const ciphertext =  ctext.toJSONObject();
            const jsonProof = proof.toJSONObject();
            const encryptedBallot = {
              alpha: ciphertext.alpha,
              beta: ciphertext.beta,
              commitment: jsonProof.commitment,
              response: jsonProof.response,
              challenge: jsonProof.challenge,
              randomness: randomness.toJSONObject(),
              plaintext: plainAnswerStr
            };

            return encryptedBallot;
          },

          getPublicKey: function() 
          {
            return publicKeyJson;
          },

          // verifies the proof of plaintext knowledge (schnorr protocol)
          verifyPlaintextProof: function(encrypted) 
          {
            const ctext = new ElGamalService.Ciphertext(
              BigIntService.fromInt(encrypted.alpha),
              BigIntService.fromInt(encrypted.beta),
              publicKey
            );
            const proof = new ElGamalService.DLogProof(
              new ElGamalService.PlaintextCommitment(
                BigIntService.fromInt(encrypted.alpha),
                BigIntService.fromInt(encrypted.commitment)
              ),
              BigIntService.fromInt(encrypted.challenge),
              BigIntService.fromInt(encrypted.response)
            );

            return ctext.verifyPlaintextProof(
              proof,
              ElGamalService.fiatshamir_dlog_challenge_generator
            );
          }
        };
      };
    }
  );

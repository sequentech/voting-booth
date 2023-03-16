/**
 * This file is part of common-ui.
 * Copyright (C) 2023  Sequent Tech Inc <legal@sequentech.io>

 * common-ui is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.

 * common-ui  is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with common-ui.  If not, see <http://www.gnu.org/licenses/>.
**/

angular.module('avUi')
  .service('ErrorCheckerGeneratorService', function(
    AnswerEncoderService,
    BigIntService
  ) {
    /**
     * @returns true if the url with the specific title and url appears in the
     * urls list.
     */
     function hasUrl(urls, title, url)
     {
       const u = _.find(
         urls,
         function(urlObject)
         {
           return urlObject.title === title && urlObject.url === url;
         }
       );

       return !!u;
     }

    /**
     * @returns number of selected options in a question
     */
    function numSelectedOptions(question, invalidVoteAnswer)
    {
        if (question.tally_type === "cumulative") 
        {
        return question.answers.reduce(
            function (accumulator, answer)
            {
            if (
                invalidVoteAnswer &&
                answer.id === invalidVoteAnswer.id
            ) {
                return accumulator;
            } else {
                return accumulator + answer.selected + 1;
            }
            },
            0
        );
        }
        else 
        {
        return _.filter(
            question.answers,
            function (element) {
            return element.selected > -1;
            }
        ).length;
        }
    }
    
    function getErrorsChecker(checkerTypeFlag, invalidVoteAnswer)
    {
      return [
        {
          check: "array-key-group-chain",
          key: "questions",
          append: {key: "qtitle", value: "$value.title"},
          prefix: "avBooth.errors.question-",
          checks: [
            // raise if vote is blank if not checkerTypeFlag
            {
              check: "lambda",
       
              appendOnErrorLambda: function (question)
              {
                return {
                  min: question.min,
                  num_selected: numSelectedOptions(question, invalidVoteAnswer),
                  question_id: question.index
                };
              },
              validator: function (question) 
              {
                if (!!question.extra_options.force_allow_blank_vote)
                {
                  return true;
                }
                return (
                  (
                    checkerTypeFlag === "soft" && 
                    !question.deselectedAtLeastOnce
                  ) ||
                  (
                    numSelectedOptions(question, invalidVoteAnswer) > 0
                  ) ||
                  (
                    checkerTypeFlag === "show-stoppers" && 
                    question.extra_options.invalid_vote_policy !== 'not-allowed'
                  ) ||
                  (
                    checkerTypeFlag === "show-stoppers" &&
                    question.extra_options.invalid_vote_policy === 'not-allowed' &&
                    question.min === 0
                  )
                );
              },
              postfix: "-blank"
            },
            // raise if vote is explicitly invalid if not checkerTypeFlag
            {
              check: "lambda",
              appendOnErrorLambda: function (question)
              {
                return {
                  question_id: question.index
                };
              },
              validator: function (question)
              {
                return !(
                  (checkerTypeFlag === "normal" || checkerTypeFlag === "soft") &&
                  question.extra_options.invalid_vote_policy === "warn-invalid-implicit-and-explicit" &&
                  question.invalidVoteAnswer &&
                  question.invalidVoteAnswer.selected > -1
                );
              },
              postfix: "-invalid"
            },
            // raise if numSelectedOptions < min, but not if blank, and
            // checkerTypeFlag is normal and invalidVoteAnswer is not set
            {
              check: "lambda",
              appendOnErrorLambda: function (question) 
              {
                return {
                  min: question.min,
                  num_selected: numSelectedOptions(question, invalidVoteAnswer),
                  question_id: question.index
                };
              },
              validator: function (question) 
              {
                if (
                  question.extra_options.invalid_vote_policy === 'allowed' ||
                  numSelectedOptions(question, invalidVoteAnswer) === 0 ||
                  (
                    question.invalidVoteAnswer && 
                    question.invalidVoteAnswer.selected > -1
                  ) ||
                  (
                    (
                      question.extra_options.invalid_vote_policy === 'warn' ||
                      question.extra_options.invalid_vote_policy === "warn-invalid-implicit-and-explicit"
                    ) &&
                    checkerTypeFlag === "show-stoppers"
                  )
                ) {
                  return true;
                }
                return (
                  (checkerTypeFlag === "normal" && !question.deselectedAtLeastOnce) ||
                  numSelectedOptions(question, invalidVoteAnswer) >= question.min
                );
              },
              postfix: "-min"
            },
            // raise if numSelectedOptions > max and invalidVoteAnswer is 
            // not selected
            {
              check: "lambda",
              appendOnErrorLambda: function (question) 
              {
                return {
                  max: question.max,
                  num_selected: numSelectedOptions(question, invalidVoteAnswer),
                  question_id: question.index
                };
              },
              validator: function (question) 
              {
                if (
                  question.extra_options.invalid_vote_policy === 'allowed' || 
                  (
                    question.invalidVoteAnswer && 
                    question.invalidVoteAnswer.selected > -1
                  ) ||
                  (
                    (
                      question.extra_options.invalid_vote_policy === 'warn' || 
                      question.extra_options.invalid_vote_policy === "warn-invalid-implicit-and-explicit"
                    ) &&
                    checkerTypeFlag === "show-stoppers"
                  )
                ) {
                  return true;
                }
                return numSelectedOptions(question, invalidVoteAnswer) <= question.max;
              },
              postfix: "-max"
            },
            // raise if multiple write-ins with the same text value and
            // invalidVoteAnswer is not selected
            {
              check: "lambda",
              appendOnErrorLambda: function (question) 
              {
                return {
                  question_id: question.index
                };
              },
              validator: function (question) 
              {
                if (
                  (
                    question.invalidVoteAnswer && 
                    question.invalidVoteAnswer.selected > -1
                  ) ||
                  question.extra_options.invalid_vote_policy === 'allowed' || 
                  (
                    (
                      question.extra_options.invalid_vote_policy === 'warn' ||
                      question.extra_options.invalid_vote_policy === "warn-invalid-implicit-and-explicit"
                    ) &&
                    checkerTypeFlag === "show-stoppers"
                  ) ||
                  !question.extra_options ||
                  !question.extra_options.allow_writeins
                ) {
                  return true;
                }

                // Try to find the repeated writeIns, excluding empty
                // write-ins
                const nonZeroWriteInAnswers = _.filter(
                  question.answers,
                  function (answer) 
                  {
                    return (
                      answer.text.length > 0 &&
                      hasUrl(answer.urls, 'isWriteIn', 'true')
                    );
                  }
                );
                const uniqWriteInTexts = _.uniq(
                  _.pluck(nonZeroWriteInAnswers, 'text')
                );
                return (
                  nonZeroWriteInAnswers.length === uniqWriteInTexts.length
                );
              },
              postfix: "-repeated-writeins"
            },
            // raise if write-in texts are too large and overflow and
            // invalidVoteAnswer is not selected
            {
              check: "lambda",
              appendOnErrorLambda: function (question) 
              {
                return {
                  max: question.writeInBytesLeft.maxWriteInBytes,
                  extra_bytes: -question.writeInBytesLeft.bytesLeft,
                  question_id: question.index
                };
              },
              validator: function (question) 
              {
                if (
                  (
                    question.invalidVoteAnswer && 
                    question.invalidVoteAnswer.selected > -1
                  ) ||
                  !question.extra_options ||
                  !question.extra_options.allow_writeins
                ) {
                  return true;
                }

                const codec = AnswerEncoderService(question);
                const numBytes = codec.numWriteInBytesLeft(
                  new BigIntService(question.publicKey.q, 10)
                );
                question.writeInBytesLeft = numBytes;
                return numBytes.bytesLeft >= 0;
              },
              postfix: "-writein-length"
            },
            // raise warning if write-in is provided but not voted and
            // invalidVoteAnswer is not selected
            {
              check: "lambda",
              appendOnErrorLambda: function (question) 
              {
                const unvotedNonEmptyWriteIns = _.filter(
                  question.answers,
                  function (answer) 
                  {
                    return (
                      answer.text.length > 0 &&
                      hasUrl(answer.urls, 'isWriteIn', 'true') &&
                      answer.selected === -1
                    );
                  }
                );
                const writeInTexts = _.pluck(unvotedNonEmptyWriteIns, 'text');
                return {
                  write_ins: writeInTexts.join(', '),
                  question_id: question.index
                };
              },
              validator: function (question) 
              {
                if (
                  (
                    question.invalidVoteAnswer && 
                    question.invalidVoteAnswer.selected > -1
                  ) ||
                  checkerTypeFlag === "show-stoppers" ||
                  !question.extra_options ||
                  !question.extra_options.allow_writeins
                ) 
                {
                  return true;
                }

                const unvotedNonEmptyWriteIns = _.filter(
                  question.answers,
                  function (answer) 
                  {
                    return (
                      answer.text.length > 0 &&
                      hasUrl(answer.urls, 'isWriteIn', 'true') &&
                      answer.selected === -1
                    );
                  }
                );
                return unvotedNonEmptyWriteIns.length === 0;
              },
              postfix: "-writeins-not-voted"
            },
            // raise warning if write-in is voted but no text provided and
            // invalidVoteAnswer is not selected
            {
              check: "lambda",
              appendOnErrorLambda: function (question) 
              {
                return {
                  question_id: question.index
                };
              },
              validator: function (question) 
              {
                if (
                  (
                    question.invalidVoteAnswer && 
                    question.invalidVoteAnswer.selected > -1
                  ) ||
                  checkerTypeFlag === "show-stoppers" ||
                  !question.extra_options ||
                  !question.extra_options.allow_writeins
                ) 
                {
                  return true;
                }

                const votedEmptyWriteIns = _.filter(
                  question.answers,
                  function (answer) 
                  {
                    return (
                      answer.text.length === 0 &&
                      hasUrl(answer.urls, 'isWriteIn', 'true') &&
                      answer.selected !== -1
                    );
                  }
                );
                return votedEmptyWriteIns.length === 0;
              },
              postfix: "-writeins-not-provided"
            },
            // raise if panachage is disabled and invalidVoteAnswer is not
            // selected
            {
              check: "lambda",
              postfix: "-panachage",
              appendOnErrorLambda: function (question) 
              {
                return {
                  question_id: question.index
                };
              },
              validator: function (question) 
              {
                if (
                  (
                    question.invalidVoteAnswer && 
                    question.invalidVoteAnswer.selected > -1
                  ) ||
                  question.extra_options.enable_panachage === undefined ||
                  question.extra_options.enable_panachage === true ||
                  question.extra_options.invalid_vote_policy === 'allowed' || 
                  (
                    (
                      question.extra_options.invalid_vote_policy === 'warn' ||
                      question.extra_options.invalid_vote_policy === "warn-invalid-implicit-and-explicit"
                    ) &&
                    checkerTypeFlag === "show-stoppers"
                  )
                ) {
                  return true;
                }

                return _.uniq(
                  question.answers
                  .filter(
                    function (answer)
                    {
                      return answer.selected !== -1;
                    }
                  )
                  .map(
                    function (answer)
                    {
                      return answer.category;
                    }
                  )
                ).length <= 1;
              },
            },
          ]
        }
      ];
    }
    return getErrorsChecker;
  });
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
describe("AnswerEncoderService tests", function () {

  beforeEach(module("avCrypto"));

  beforeEach(inject(function (_AnswerEncoderService_, _DeterministicJsonStringifyService_) {
    answerEncoder = _AnswerEncoderService_;
    stringify = _DeterministicJsonStringifyService_;
  }));

  it("AnswerEncoderService test", function () {
    
    var answer = [1, 5];
    var codec = answerEncoder("plurality-at-large", 7);
    expect(codec.sanityCheck()).toBe(true); // false
    
    var encoded = codec.encode(answer);
    var decoded = codec.decode(encoded);
    // false; [5, 1] == [1, 5]
    expect((stringify(decoded) == stringify(answer))).toBe(true);  
    
  });

});

/* jshint ignore:end */

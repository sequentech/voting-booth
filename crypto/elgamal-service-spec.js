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
 * ElGamalService unit tests
 * Tests params/json on this service 
 */
/* jshint ignore:start */
describe("ElGamalService tests", function () {
  
  var jsonObj = {
    "p":"1",
    "q":"2",
    "g":"3"
  };

  beforeEach(module("avCrypto"));

  beforeEach(inject(function (_ElGamalService_) {
    ElGamal = _ElGamalService_;
  }));

  it("ElGamalService params/json test", function () {
    var egParams = new ElGamal.Params(
            BigInt.fromInt(jsonObj.p),
            BigInt.fromInt(jsonObj.q),
            BigInt.fromInt(jsonObj.g)
            );

    var newJsonObj = egParams.toJSONObject();
    expect(BigInt.fromInt(newJsonObj.p).toString()).toBe("1");   
    
  });

});

/* jshint ignore:end */
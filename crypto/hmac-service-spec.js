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

/* jshint ignore:start */
describe("HmacService tests", function() {
  var HmacService;
  var key = "this is a secret";
  var message = "En un lugar de la Mancha";
  var hash = "6a4cdcebed4fad9f96bf3c6774919606c565570bac2ef808e764427eaf2377ea";

  beforeEach(module("avCrypto"));

  beforeEach(inject(function (_HmacService_) {
    HmacService = _HmacService_;
  }));

  it("should generate the expected hmac", inject(function() {
    expect(HmacService.hmac(key, message)).toBe(hash);
    expect(HmacService.checkHmac(key, message, hash)).toBe(true);
  }));

  it("should compare strings correctly", inject(function() {
    expect(HmacService.equal(hash, hash)).toBe(true);
    expect(HmacService.equal(hash, key)).toBe(false);
  }));
});
/* jshint ignore:end */
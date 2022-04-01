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
 * SjclService unit tests
 * 
 * Tests if SjclService.codec.utf8String.toBits() and
 * SjclService.codec.codec.utf8String.fromBits() work properly
 */
/* jshint ignore:start */
describe("SjclService tests", function () {

  beforeEach(module("avCrypto"));

  beforeEach(inject(function (_SjclService_) {
    sjcl = _SjclService_;
  }));

  it("SjclService codec.utf8String.toBits/fromBits test", function () {
    var keyBits = sjcl.codec.utf8String.toBits("hola");
    expect(sjcl.codec.utf8String.fromBits(keyBits)).toBe("hola");
  });

});

/* jshint ignore:end */
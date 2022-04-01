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
 * Random utility functions, using a repeatable by seed algorithm
 *
 * NOTE: It uses RC4 algorithm, so it's not cryptographically secure random, but
 * it's a good enough distribution for other purposes like shuffling items.
 */
angular.module('avUi')
  .service('RandomHelper', function() {
    var self = {
      /*
       * generates a Pseudo-Random Number Generator with the given seed
       */
      prng: function (seed)
      {
        /* jshint ignore:start */
        return new RNG(seed);
        /* jshint ignore:end */
      },

      /*
       * shuffle an array with a given seed, altering the array items' order
       */
      shuffle: function (l, prng)
      {
        var length = l.length;
        for (var index = length - 1, rand, item; index >= 0; index--) {
          rand = prng.random(0, index);
          if (rand !== index) {
            item = l[index];
            l[index] = l[rand];
            l[rand] = item;
          }
        }
      }
    };
    return self;
  });

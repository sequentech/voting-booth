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
 * Selected Options directive.
 *
 * Lists the selected options for a question, allowing to change selection.
 */
angular.module('avBooth')
  .directive('avbSelectedOptions', function() {

    var link = function(scope, element, attrs) {
      scope.touchEventsList = [];
      scope.divElement = angular.element(element)[0];

      function searchElem(elem, touch) {
        var optionsDomList = elem.getElementsByClassName("animate-repeat");
        for (var i = 0; i < optionsDomList.length; i++) {
          var rect = optionsDomList[i].getClientRects()[0];
          if (rect.left <= touch.clientX &&
              rect.right >=  touch.clientX &&
              rect.top <=  touch.clientY &&
              rect.bottom >=  touch.clientY) {
             return i;
          }
        }
        return -1;
      }

      element.on("touchstart", function (jEvent) {
          var timeStamp = Date.now();
          var e = jEvent.originalEvent;
          if (1 !== e.changedTouches.length) {
            return;
          }
          var touch = e.changedTouches[0];
          if (!scope.touchEventsList[touch.identifier]) {
            console.log("adding identifier " + touch.identifier);
            var i = searchElem(scope.divElement, touch);
            console.log("start id " + i);
            if (-1 !== i) {
              touch.itemId = i;
              touch.timeStamp = timeStamp;
              touch.timeOut = setTimeout(function(){ 
                if ('waiting' === touch.state) {
                  touch.state = 'dragndrop';
                }
              }, 1000);
              touch.state = 'waiting';
              scope.touchEventsList[touch.identifier] = touch;
            }
          }
          return true;
        });

      element.on("touchmove", function (jEvent) {
          var timeStamp = Date.now();
          var e = jEvent.originalEvent;
          var retval = true;
          if (1 !== e.changedTouches.length) {
            return;
          }
          var touch = e.changedTouches[0];
          if (!!scope.touchEventsList[touch.identifier]) {
            console.log("processing move identifier " + touch.identifier);

            var touchEvent = scope.touchEventsList[touch.identifier];
            if ( 'waiting' === touchEvent.state ) {
              touch.state = 'scrolling';
              if (!!touchEvent.timeOut) {
                clearTimeout(touchEvent.timeOut);
                delete touchEvent.timeOut;
                console.log("timeout cancelled for identifier " + touch.identifier);
              }
            }
            else if ( 'dragndrop' === touchEvent.state ) {
              e.preventDefault();
              retval = false;
              var i = searchElem(scope.divElement, touch);
              console.log("move id " + i);
              if (-1 !== i) {
                var touchEvent = scope.touchEventsList[touch.identifier];
              }
            }

          }
          return retval;
        });

      element.on("touchcancel", function (jEvent) {
          var e = jEvent.originalEvent;
          if (1 !== e.changedTouches.length) {
            return;
          }
          var touch = e.changedTouches[0];
          if (!!scope.touchEventsList[touch.identifier]) {
            console.log("cancelling identifier " + touch.identifier);
            var touchEvent = scope.touchEventsList[touch.identifier];
            if (!!touchEvent.timeOut) {
              clearTimeout(touchEvent.timeOut);
              delete touchEvent.timeOut;
              console.log("timeout cancelled for id " + touch.identifier);
            }
            delete scope.touchEventsList[touch.identifier];
          }
          return true;
        });

      element.on("touchend", function (jEvent) {
          var retval = true;
          var e = jEvent.originalEvent;
          if (1 !== e.changedTouches.length) {
            return;
          }
          var touch = e.changedTouches[0];
          if (!!scope.touchEventsList[touch.identifier]) {
            console.log("ending identifier " + touch.identifier);
            var touchEvent = scope.touchEventsList[touch.identifier];
            var i = searchElem(scope.divElement, touch);
            console.log("end id " + i);
            if ( 'dragndrop' === touchEvent.state ) {
              e.preventDefault();
              retval = false;
            }
            delete scope.touchEventsList[touch.identifier];
          }
          return retval;
        });

        if (!angular.isDefined(scope.presetSelectedSize)) {
          scope.presetSelectedSize = 0;
        }

        if (!angular.isDefined(scope.question)) {
          scope.question = {
            tally_type: scope.tallyType,
            max: scope.max
          };
        }
        /*
         * Toggles selection, if possible.
         */
        scope.toggleSelectItem = function(option) {
          if (option.selected > -1) {
            _.each(scope.options, function (element) {
              if (element.selected > option.selected) {
                element.selected -= 1;
              }
            });
            option.selected = -1;
          } else {
            var numSelected = _.filter(scope.options, function (element) {
              return element.selected > -1;
            }).length;

            // can't select more
            if (numSelected === scope.max) {
              return;
            }

            option.selected = numSelected;
          }
        };

      scope.numSelectedOptions = function () {
        return _.filter(
          scope.options,
          function (element) {
            return element.selected > -1 || element.isSelected === true;
          }).length;
      };

      scope.moveOption = function (moved, newPos) {
        var oldPos = moved.selected;
        newPos -= 1;
        if (oldPos === newPos || scope.presetSelectedSize > 0 && newPos < scope.presetSelectedSize) {
          return false;
        }

        if (newPos > oldPos) {
          _.each(scope.options, function (el) {
            if (el.selected === -1) {
              return;
            }

            if (el.id === moved.id) {
              el.selected = moved.selected = newPos;
            } else if (el.selected > oldPos && el.selected <= newPos) {
              el.selected -= 1;
              console.log("-- el.selected " + el.selected + ", el.text " + el.text);
            }
          });
        } else if (newPos < oldPos) {
          newPos += 1;
          _.each(scope.options, function (el) {
            if (el.selected === -1) {
              return;
            }

            if (el.id === moved.id) {
              el.selected = moved.selected = newPos;
            } else  if (el.selected >= newPos && el.selected < oldPos) {
              el.selected += 1;
              console.log("++ el.selected " + el.selected + ", el.text " + el.text);
            }
          });
        }
        return false;
      };


      scope.moveOption2 = function (moved, newPos) {
        var oldPos = moved.selected;
        var movedAlcaldable = (moved.category !== moved.categoryUnified);
        if (oldPos === newPos || (newPos === 0 && !movedAlcaldable)) {
          return false;
        }

        if (newPos > oldPos) {
          newPos -= 1;
          _.each(scope.options, function (el) {
            if (el.selected === -1) {
              return;
            }

            if (el.id === moved.id) {
              if (oldPos === 0) {
                el.selected = moved.selected = newPos + 1;
              } else {
                el.selected = moved.selected = newPos;
              }
            } else if (oldPos > 0 && el.selected > oldPos && el.selected <= newPos) {
              el.selected -= 1;
            } else if (oldPos === 0 && el.selected > newPos) {
              if (el.selected + 1 === scope.max) {
                el.selected = -1;
              } else {
                el.selected += 1;
              }
              console.log("-- el.selected " + el.selected + ", el.text " + el.text);
            }

            if (movedAlcaldable) {
              scope.blankVote.selected = 0;
            }
          });
        } else if (newPos < oldPos) {
          _.each(scope.options, function (el) {
            if (el.selected === -1) {
              return;
            }

            if (el.id === moved.id) {
              el.selected = moved.selected = newPos;
            } else  if (scope.blankVote.selected === 0 && newPos === 0) {
              if (el.selected > oldPos) {
                el.selected -= 1;
              }
            } else if (el.selected >= newPos && el.selected <= oldPos &&
              el.id !== scope.blankVote.id)
            {
              el.selected += 1;
              console.log("++ el.selected " + el.selected + ", el.text " + el.text);
            }
          });

          if (scope.blankVote.selected === 0 && newPos === 0) {
            scope.blankVote.selected = -1;
          }
        }
        return false;
      };

      scope.blankVote = _.filter(
        scope.options,
        function (el) {
          return (el.category === "Voto en blanco a la alcaldía");
        })[0];

      // doesn't count the first option which implies a blank vote in the first "round/question"
      scope.numSelectedOptions2 = function () {
        return _.filter(
          scope.options,
          function (element) {
            return (element.selected > -1 || element.isSelected === true) && element.id !== 0;
          }).length;
      };

      scope.toggleSelectItem2 = function(option) {
        if (option.id === 0) {
          return;
        }
        var elIsAlcaldable;

        if (option.selected > -1) {
          elIsAlcaldable = (option.category !== option.categoryUnified && option.selected === 0);
          if (elIsAlcaldable) {
            scope.blankVote.selected = 0;
          } else {
            _.each(scope.options, function (element) {
              if (element.selected > option.selected) {
                element.selected -= 1;
              }
            });
          }

          option.selected = -1;
        } else {
          var numSelected = scope.numSelectedOptions();
          var numSelected2 = scope.numSelectedOptions2();
          var alcaldableSelected = (numSelected === numSelected2);
          elIsAlcaldable = (option.category !== option.categoryUnified);
          var max = parseInt(scope.max,10);

          if (elIsAlcaldable) {
            if (!alcaldableSelected) {
              option.selected = 0;
              scope.blankVote.selected = -1;
            } else {

              // can't select more, flash info
              if (numSelected === parseInt(scope.max,10)) {
                $("#maxSelectedLimitReached").flash();
                return;
              }

              // put first in the list of concejalias as requested by client
              _.each(scope.options, function(el) {
                if (el.selected > 0) {
                  el.selected += 1;
                }
              });
              option.selected = 1;
            }
          } else {
            // can't select more, flash info
            if (numSelected === parseInt(scope.max,10)) {
              $("#maxSelectedLimitReached").flash();
              return;
            }

            option.selected = numSelected;
          }
        }
      };
    };

    return {
      restrict: 'AE',
      scope: {
        max: '=',
        min: '=',
        options: '=',
        tallyType: '=',
        presetSelectedSize: '=',
        layout: '=',
        sorted: "=",
        ordered: "="
      },
      link: link,
      templateUrl: 'avBooth/selected-options-directive/selected-options-directive.html'
    };
  });
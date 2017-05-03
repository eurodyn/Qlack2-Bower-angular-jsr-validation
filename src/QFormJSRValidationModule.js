/*
* (c) EUROPEAN DYNAMICS SA <info@eurodyn.com>
*
* Licensed under the EUPL, Version 1.1 only (the "License").
* You may not use this work except in compliance with the Licence.
* You may obtain a copy of the Licence at:
* https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the Licence is distributed on an "AS IS" basis,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the Licence for the specific language governing permissions and
* limitations under the Licence.
*/
angular.module('QFormJSRValidation', [])

.provider('QFormJSRValidation', function() {
	this.$get = function() {
		return new QFormJSRValidationService();
	};
})

.directive("fieldError", ["$state", "$injector", function($state, $injector) {
	return {
		restrict: "E",
		link: function(scope, element, attrs) {
			// Get a reference to the translation service, or create a mock 
			// version of it if it's not available.
			var translate;
			if ($injector.has("$translate")) {
				translate = $injector.get("$translate");
			} else {
				translate = {
					instant: function(key) {
						return (key);
					}
				}
			}
			
			// Find the form on which this element is embedded into.
			var form = $(element).closest("form");
			
			// Find the name of the form on which this element is embedded into.
			var formName = form.attr("name");
			
			// When the target form element becomes invalid, show validation errors.
			var validWatch = scope.$watch(formName + "[\'" + attrs.formElementName + "\'].$valid", function(newVal, oldVal) {
				if (newVal != undefined && newVal == false) {
					// Iterate through all errors.
					var errorHtml = "<ul>";
					$.each(deep_value(scope, formName)[attrs.formElementName].$error, function (key, val) {
						errorHtml += "<li>" + translate.instant(key) + "</li>";
					});
					errorHtml += "</ul>";
					element.html(errorHtml);
					$(element).show();
				}
			});
			
			// When the user changes the value of the target element, clear validation errors.
			var pristineWatch = scope.$watch(formName + "[\'" + attrs.formElementName + "\'].$pristine", function(newVal, oldVal) {
				if (newVal == false) {
					$(element).hide();
				} 
			});
			
			scope.$on("$destroy", function() {
				validWatch();
				pristineWatch();
			});
		}
	};
}])

.directive("formError", ["$state", function($state) {
	return {
		restrict: "E",
		link: function(scope, element, attrs) {
			// Find the form on which this element is embedded into.
			var form = $(element).closest("form");
			
			// Find the name of the form on which this element is embedded into.
			var formName = form.attr("name");
			
			// Create a watch for the generic form errors for this field.
			var errorWatch = scope.$watch(formName + ".$error", function(newVal, oldVal) {
				if (newVal != undefined) {
					if (newVal[attrs.dtoElementName] != undefined ) {
						$(element).show();
					}
				}
			}, true);

			// Create watchers for the validity and pristine of each tracked
			// field. When any of the tracked fields is changed, the generic
			// form error is removed.
			var trackFields = attrs.trackFields.split(",");
			var pristineWatch = [];
			$.each(trackFields, function(i, val) {
				pristineWatch.push(scope.$watch(formName + "[\'" + val + "\'].$pristine", function(newVal, oldVal) {
					if (newVal == false) {
						$(element).hide();
					}
				}));
			});
			
			scope.$on("$destroy", function() {
				errorWatch();
				pristineWatch.forEach(function(callback) {
					callback();
				});
			});
		}
	};
}])

.directive("showsValidationErrors", ["$state", function($state) {
	return {
		restrict: 'A',
		require: 'form',
		link: function (scope, element) {
			element.on('submit', function () {
				var form = deep_value(scope,  element.context.name);
				// Reset field errors.
				$.each(form, function(key) {
					if (typeof form[key] == "object") {
						if (typeof form[key].$setPristine == "function" && key != "$$parentForm") {
							form[key].$setPristine(true);
							form[key].$valid = true;
							$.each(form[key].$error, function (errorKey) {
								form[key].$setValidity(errorKey, true);
							});
						}
					}
				});
				
				// Reset generic form errors.
				form.$error = {};
			});
		}
	};
}]);

/** Find an object possible deeply nested */
var deep_value = function(obj, path){
  for (var i=0, path=path.split('.'), len=path.length; i<len; i++){
    obj = obj[path[i]];
  };
  return obj;
};

function QFormJSRValidationService() {
	this.markErrors = function($scope, form, data) {
		// Add errors.
		$.each(data, function(i, val) {
			// Before setting the error for the field we should check whether
			// such field does exist. This is necessary for @NotNull validation 
			// errors of nested objects, since the error key in that case is the 
			// name of the nested object itself. In such cases, the error is 
			// added as a generic form error which can be displayed with the
			// form-error directive.
			if (form[val.path] !== undefined && typeof form[val.path].$setValidity == "function") {
				form[val.path].$setValidity(val.message, false);
			} else {
				form.$setValidity(val.path, false, val.message);
			}
		});
	};
}
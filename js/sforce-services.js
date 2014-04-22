'use strict';

///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
// (c) Camp Eagle 2014
// Author: Joel Jeske
// 
//
// This module can be reused on any Visualforce page with limited dependency on the Apex Page iteself. 
// This module should be declared before the Visualforce page tries to add 'actions' and 'vforce' to the 
// module for depencey resolution.
//
// Require on the Visualforce page
//
//    angular.module("sforceRemoting").
//        value('actions', {
//            <function name>: { qname: '{!$RemoteAction.<Apex Class>.<Remoting Method Name>}' }
//        });
//        
//
angular.module("sforceRemoting", []).
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Include the Visualforce object in our dependency list
	//
	value("vforce", window.Visualforce).
	
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// This service creates a 'salesforce' object which contains properties of available Visalforce remote 
	// actions.
	//
	provider('salesforce', function salesforceProvider(){
		
		//Salesforce specified configuration options
		var __config = {
			 buffer: true, 
			 escape: true, 
			 timeout: 30000
		};
		
		//Expose setter methods for the configuration object for configuration by the application
		this.escape = function(esc){ __config.escape = esc; };
		this.useBuffer = function(buffer){ __config.buffer = !!buffer; };
		this.setTimeout = function(timeout){ __config.timeout = timeout; };
		
		//Provider standard get object
		this.$get = ["actions", "vforce", "$q", "$window",  function(actions, vforce, $q, $window){

					
			//This is our function performer object that will be called for each action available
			var performFunction = function(name, args){
				var def = $q.defer();
				
				//Get the action requested from our action list
				//Get the fully qualified remoting action name as specified from the visualforce page on server processing
				var qname = actions[name].qname;
				
				//Create a simple callback to resolve our promise.
				var callback = function(result, event){ 
					//Fulfill our promise depending on our results
					(event.status && event.type !== "exception") ? def.resolve(result, event) : def.reject(event);  
				};
				
				//Combine all our args into an array to use with apply
				var params = [qname].concat(args, [callback, __config]);
				//Invoke action using the Visualforce object injected by Angular from the visualforce preprocessed page
				vforce.remoting.Manager.invokeAction.apply(vforce.remoting.Manager, params);
	
				//Return our promise to completion
				return def.promise;
			};
	
			//Make an API object that can call various actions easily. 
			var __api = {};

			//Make all the actions available on this object
			for(var action in actions)
			{	
				//Create a simple function for each action available
				__api[action] = apiFunction(action);
			}
			
			function apiFunction(name){
				return function(){
					return performFunction(name, Array.prototype.slice.call(arguments)); 
				}
			}
			
			return __api;
		}];
	});
	
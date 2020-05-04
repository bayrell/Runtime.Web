"use strict;"
/*!
 *  Bayrell Core Library
 *
 *  (c) Copyright 2018-2019 "Ildar Bikmamatov" <support@bayrell.org>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
if (typeof Runtime == 'undefined') Runtime = {};
if (typeof Runtime.Web == 'undefined') Runtime.Web = {};
if (typeof Runtime.Web.Drivers == 'undefined') Runtime.Web.Drivers = {};
Runtime.Web.Drivers.BusProvider = function(ctx)
{
	Runtime.CoreProvider.apply(this, arguments);
};
Runtime.Web.Drivers.BusProvider.prototype = Object.create(Runtime.CoreProvider.prototype);
Runtime.Web.Drivers.BusProvider.prototype.constructor = Runtime.Web.Drivers.BusProvider;
Object.assign(Runtime.Web.Drivers.BusProvider.prototype,
{
	assignObject: function(ctx,o)
	{
		if (o instanceof Runtime.Web.Drivers.BusProvider)
		{
		}
		Runtime.CoreProvider.prototype.assignObject.call(this,ctx,o);
	},
	assignValue: function(ctx,k,v)
	{
		Runtime.CoreProvider.prototype.assignValue.call(this,ctx,k,v);
	},
	takeValue: function(ctx,k,d)
	{
		if (d == undefined) d = null;
		return Runtime.CoreProvider.prototype.takeValue.call(this,ctx,k,d);
	},
	getClassName: function(ctx)
	{
		return "Runtime.Web.Drivers.BusProvider";
	},
});
Object.assign(Runtime.Web.Drivers.BusProvider, Runtime.CoreProvider);
Object.assign(Runtime.Web.Drivers.BusProvider,
{
	
	/**
	 * Send Message
	 */
	sendMessage: function(ctx, msg)
	{
		return (ctx, provider) =>
		{
			return (__async_t) =>
			{
				if (__async_t.pos() == "0")
				{
					if (msg instanceof Runtime.MessageRPC)
					{
						return __async_t
							.jump(ctx, "1")
							.call(ctx, this.sendMessageRPC(ctx, msg)(ctx, provider), "__v0")
						;
					}
					return __async_t.ret(__async_t, msg);
				}
				else if (__async_t.pos() == "1")
				{
					return __async_t.ret(ctx, __async_t.getVar(ctx, "__v0"));
				}
				return __async_t.ret_void();
			};
		}
	},
	
	
	
	/**
	 * Convert data to Native for ajax POST request
	 * @params serializable data
	 * @return Vector
	 */
	buildData: function(ctx, data)
	{
		var res = [];
		var json = Runtime.RuntimeUtils.json_encode(ctx, data);
		json = btoa( unescape(encodeURIComponent(json)) );
		res.push({"key": "DATA", "val": json});
		return res;
	},
	
	
	
	/**
	 * Returns FormData
	 * @params data - json object
	 * @return FormData
	 */
	buildPostData: function(ctx, data)
	{
		var post_data = new FormData();
		
		/* Add data to post data */
		for (var i=0; i<data.length; i++)
		{
			var obj = data[i];
			var key = obj.key;
			var val = obj.val;
			if (val instanceof FileList)
			{
				for (var i=0; i<val.length; i++)
				{
					post_data.append(key + "[]", val.item(i), val.item(i).name);
				}
			}
			else if (val instanceof File)
			{
				post_data.append(key, val, val.name);
			}
			else
			{
				post_data.append(key, val);
			}
		}
		
		return post_data;
	},
	
	
	
	/**
	 * Remote procedure call
	 */
	sendMessageRPC: function(ctx, msg)
	{
		return (ctx, provider) =>
		{
			return (__async_t) =>
			{
				var api_name = msg.api_name;
				var space_name = msg.space_name;
				var method_name = msg.method_name;
				var uri = msg.uri;
				var data = msg.data;
				
				/* Build pos data */
				data = this.buildData(ctx, data);
				var post_data = this.buildPostData(ctx, data);
				
				var local_bus_gate = ctx.enviroments.get(ctx, "local_bus_gate", "");
				var url = (uri != "") ? uri : 
					local_bus_gate  + "/" + api_name + '/' + space_name + '/' + method_name + '/'
				;
				
				this.sendPost
				(
					ctx, url, post_data,
					(function(__async_t, msg)
					{
						return function (ctx, xhr)
						{
							if (xhr.readyState != 4) return;
							
							if (xhr.status != 200)
							{
								msg = msg.copy
								(
									ctx, 
									{
										"have_result": true,
										"error": "Error code " + xhr.status,
										"code": Runtime.RuntimeConstant.ERROR_RESPONSE,
										"response": null,
									}
								);
								
								__async_t.resolve(ctx, msg);
								
								return;
							}
							
							var res = {};
							var exists = Runtime.rtl.exists;
							try
							{
								res = JSON.parse(xhr.responseText);
								
								var response = Runtime.RuntimeUtils.NativeToObject
								(
									ctx,
									exists(ctx, res.response) ? res.response : null
								);
								
								//console.log(response);
								
								msg = msg.copy
								(
									ctx, 
									{
										"have_result": exists(ctx, res.have_result) ? res.have_result : false,
										"success_message": exists(ctx, res.success_message) ? res.success_message : "",
										"error": exists(ctx, res.error) ? res.error : "Unknown error",
										"code": exists(ctx, res.code) ? res.code : Runtime.RuntimeConstant.ERROR_UNKNOWN,
										"response": response,
									}
								);
							}
							catch (e)
							{
								msg = msg.copy
								(
									ctx, 
									{
										"have_result": true,
										"error": "Json parse error",
										"code": Runtime.RuntimeConstant.ERROR_PARSE_SERIALIZATION_ERROR,
										"response": null,
									}
								);
							}
							
							__async_t.resolve(ctx, msg);
						}
					})(__async_t, msg)
				);
				
				return null;
			};
		}
	},
	
	
	
	/**
	 * Send post. Returns json object or null if error
	 */
	post: function(ctx, obj)
	{
		return (ctx, provider) =>
		{
			return (__async_t) =>
			{
				var url = obj.get(ctx, "url");
				var data = obj.get(ctx, "data");
				
				/* Build pos data */
				data = this.buildData(ctx, data);
				var post_data = this.buildPostData(ctx, data);
				
				this.sendPost
				(
					ctx, url, post_data,
					(function(__async_t)
					{
						return function (ctx, xhr)
						{
							if (xhr.readyState != 4) return;
							
							var res = null;
							if (xhr.status == 200)
							{
								try
								{
									res = JSON.parse(xhr.responseText);
								}
								catch (e)
								{
									res = null;
								}
							}
							
							__async_t.resolve(ctx, res);
						}
					})(__async_t)
				);
					
				return null;
			};
		}
	},
	
	
	
	/**
	 * Send api request
	 * @param string class_name
	 * @param string method_name
	 * @param Map<string, mixed> data
	 * @param callback f
	 */ 
	sendPost: function(ctx, url, post_data, f)
	{
		/* Add CSRF Token */
		/*post_data.append("csrf_token", Runtime.Web.Driver.BusProvider.GetCookie("csrf_token"));*/
		
		/* Send AJAX Request */
		var xhr = new XMLHttpRequest();
		xhr.open('POST', url, true);
		xhr.send(post_data);
		xhr.onreadystatechange = (function(ctx, xhr, f) {
			return function()
			{
				f(ctx, xhr);
			}
		})(ctx, xhr, f);
	},
	
	
	
	/* ======================= Class Init Functions ======================= */
	getCurrentNamespace: function()
	{
		return "Runtime.Web.Driver";
	},
	getCurrentClassName: function()
	{
		return "Runtime.Web.Drivers.BusProvider";
	},
	getParentClassName: function()
	{
		return "Runtime.CoreProvider";
	},
	getClassInfo: function(ctx)
	{
		var Collection = Runtime.Collection;
		var Dict = Runtime.Dict;
		var IntrospectionInfo = Runtime.Annotations.IntrospectionInfo;
		return new IntrospectionInfo(ctx, {
			"kind": IntrospectionInfo.ITEM_CLASS,
			"class_name": "Runtime.Web.Drivers.BusProvider",
			"name": "Runtime.Web.Drivers.BusProvider",
			"annotations": Collection.from([
			]),
		});
	},
	getFieldsList: function(ctx, f)
	{
		var a = [];
		if (f==undefined) f=0;
		return Runtime.Collection.from(a);
	},
	getFieldInfoByName: function(ctx,field_name)
	{
		return null;
	},
	getMethodsList: function(ctx)
	{
		var a = [
		];
		return Runtime.Collection.from(a);
	},
	getMethodInfoByName: function(ctx,field_name)
	{
		return null;
	},
	__implements__:
	[
		Runtime.Interfaces.BusInterface,
	],
});
Runtime.rtl.defClass(Runtime.Web.Drivers.BusProvider);
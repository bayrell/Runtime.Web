/*!
 *  BayLang Technology
 *
 *  (c) Copyright 2016-2025 "Ildar Bikmamatov" <support@bayrell.org>
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

const fs = require("fs").promises;
const use = require("bay-lang").use;
const BaseProvider = use("Runtime.BaseProvider");
const rtl = use("Runtime.rtl");

class Express extends BaseProvider
{
	/**
	 * Create object
	 */
	constructor(params)
	{
		super(params);
	}
	
	
	/**
	 * Init varibles
	 */
	_init()
	{
		super._init();
		this.instance = null;
		this.port = 3000;
		this.host = "0.0.0.0";
		this.debug = false;
		this.static = null;
	}
	
	
	/**
	 * Init params
	 */
	initParams(params)
	{
		super.initParams(params);
		
		if (!params) return;
		if (params.has("port")) this.port = params.get("port");
		if (params.has("host")) this.host = params.get("host");
		if (params.has("debug")) this.debug = params.get("debug");
		if (params.has("static")) this.static = params.get("static");
	}
	
	
	/**
	 * Create instance
	 */
	createInstance()
	{
		if (this.instance) return;
		
		const express = require("express");
		this.instance = express(this.getParams());
	}
	
	
	/**
	 * Returns params
	 */
	getParams()
	{
		let params = {};
		return params;
	}
	
	
	/**
	 * Create request from fastify
	 */
	createRequest(req)
	{
		const RuntimeMap = use("Runtime.Map");
		const Request = use("Runtime.Web.Request");
		const Headers = use("Runtime.Web.Headers");
		
		/* Create */
		const request = new Request();
		request.initUri(req.url);
		request.host = req.hostname;
		request.method = req.method;
		request.protocol = req.protocol;
		request.is_https == request.protocol == "https";
		request.query = new RuntimeMap(req.query);
		request.headers = new Headers(new RuntimeMap(req.headers));
		request.headers.set("remote_addr", req.ip);
		
		return request;
	}
	
	
	/**
	 * Process request
	 */
	request(routeInfo)
	{
		return async (request, response) =>
		{
			/* Create RenderContainer */
			const RedirectResponse = use("Runtime.Web.RedirectResponse");
			const RenderContainer = use("Runtime.Web.RenderContainer");
			let container = new RenderContainer();
			container.request = this.createRequest(request);
			container.route = routeInfo;
			
			/* Setup route */
			container.route = routeInfo;
			
			/* Resolve route */
			await container.resolveRoute();
			container.createResponse();
			
			/* Set http code */
			response.status(container.response.http_code);
			
			/* Set redirect location */
			if (container.response instanceof RedirectResponse)
			{
				response.location(container.response.redirect);
				return;
			}
			
			/* Send headers */
			for (let key in container.response.headers.keys())
			{
				response.setHeader(key, container.response.headers.get(key));
			}
			
			/* Set default content type */
			if (!container.response.headers.has("Content-Type"))
			{
				response.setHeader("Content-Type",
					"text/html; charset=utf8");
			}
			
			/* Send data */
			response.send(container.response.getContent());
		}
	}
	
	
	/**
	 * Register routes dynamically
	 */
	async registerRoutes()
	{
		const context = rtl.getContext();
		const route_provider = context.provider("Runtime.Web.RouteProvider");
		
		/* Get routes collection */
		const routes = route_provider.routes_list;
		
		/* Iterate over routes */
		for (const routeInfo of routes)
		{
			/* Determine HTTP method (default: get) */
			let method = routeInfo.method.toLowerCase() || "get";
			
			/* Register route */
			this.instance[method](
				routeInfo.uri, this.request(routeInfo)
			)
		}
	}
	
	
	/**
	 * Init provider
	 */
	async init()
	{
		const context = rtl.getContext();
		const hook = context.provider("hook");
		
		/* Create express instance */
		const express = require("express");
		this.createInstance();
		
		/* Error handler */
		this.instance.use((err, req, res, next) => {
			/*console.error(`Error at ${req.url}:`, err.stack);*/
			res.status(500).json({ error: err.message });
		});
		
		/* Static files */
		if (this.static)
		{
			for (let key in this.static)
			{
				let obj = this.static[key];
				this.instance.use(obj.uri,
					express.static(obj.path));
				
				try
				{
					let stat = await fs.stat(obj.path);
					obj.isDirectory = stat.isDirectory();
				}
				catch (err)
				{
				}
			}
			
			/* Route prefix */
			const route_prefix = context.env("ROUTE_PREFIX", "");
			
			/* Register assets */
			const WebHook = use("Runtime.Web.Hooks.AppHook");
			hook.register(WebHook.ROUTE_BEFORE, (params) => {
				const container = params.get("container");
				const layout = container.layout;
				const assets = layout.get("assets");
				for (let key in this.static)
				{
					let obj = this.static[key];
					if (obj.isDirectory)
					{
						assets.register(key, route_prefix + obj.uri);
					}
				}
			});
		}
		
		/* Register routes */
		await this.registerRoutes();
	}
	
	
	/**
	 * Start provider
	 */
	async start()
	{
		/* Start server */
		this.instance.listen(this.port);
		console.log(`Server listening on ${this.port}`);
	}
	
	
	/**
	 * Main
	 */
	async main()
	{
	}
	
	
	/**
	 * Returns class name
	 */
	static getClassName()
	{
		return "Runtime.Web.Express";
	}
}

use.add(Express);
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
const RuntimeMap = use("Runtime.Map");
const RuntimeVector = use("Runtime.Vector");
const BaseProvider = use("Runtime.BaseProvider");
const rtl = use("Runtime.rtl");

class Fastify extends BaseProvider
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
		this.fastify = null;
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
	 * Create fastify instance
	 */
	createFastify()
	{
		if (this.fastify) return;
		
		const fastify = require("fastify");
		this.fastify = fastify(this.getFastifyParams());
	}
	
	
	/**
	 * Returns fastify params
	 */
	getFastifyParams()
	{
		let params = {};
		return params;
	}
	
	
	/**
	 * Set body
	 */
	setBody(payload, fieldname, value)
	{
		if (fieldname.indexOf("[") >= 0)
		{
			let arr = fieldname.split("[").map(
				s => s.replaceAll("]", "")
			);
			
			let obj = payload;
			for (let i=0; i<arr.length - 1; i++)
			{
				let key = arr[i];
				if (!obj.has(key))
				{
					let nextkey = arr[i + 1];
					let item = null;
					if (Number(nextkey) == nextkey)
					{
						item = new RuntimeVector();
					}
					else
					{
						item = new RuntimeMap();
					}
					if (obj instanceof RuntimeVector)
					{
						obj.push(item);
					}
					else
					{
						obj.set(key, item);
					}
				}
				obj = obj.get(key);
			}
			
			let name = arr[arr.length - 1];
			if (obj instanceof RuntimeVector) obj.push(value);
			else obj.set(name, value);
		}
		else
		{
			payload.set(fieldname, value);
		}
	}
	
	
	/**
	 * Parse multipart form data
	 */
	async parseMultipart(request)
	{
		const File = use("Runtime.File");
		const parts = request.parts();
		const body = new RuntimeMap();
		
		for await (const part of parts)
		{
			/* If part is file */
			if (part.file)
			{
				/* Create file */
				let file = new File();
				file.name = part.filename;
				file.type = part.mimetype;
				file.encoding = part.encoding;
				file.content = part;
				
				this.setBody(body, part.fieldname, file);
			}
			/* If part is text field */
			else
			{
				this.setBody(body, part.fieldname, part.value);
			}
		}
		
		return body;
	}
	
	
	/**
	 * Create request from fastify
	 */
	async createRequest(req)
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
		request.is_https = request.protocol == "https";
		request.query = new RuntimeMap(req.query);
		request.headers = new Headers(new RuntimeMap(req.headers));
		request.headers.set("remote_addr", req.ip);
		
		/* Determine content type */
		const contentType = req.headers["content-type"] || "";
		
		/* Parse multipart form data */
		if (contentType.includes("multipart/form-data"))
		{
			request.payload = await this.parseMultipart(req);
		}
		/* Parse JSON */
		else if (contentType.includes("application/json"))
		{
			request.payload = new RuntimeMap(req.body || {});
		}
		/* Parse URL encoded form */
		else
		{
			request.payload = new RuntimeMap(req.body || {});
		}
		
		return request;
	}
	
	
	/**
	 * Process request
	 */
	request(routeInfo)
	{
		return async (request, reply) =>
		{
			/* Create RenderContainer */
			const RedirectResponse = use("Runtime.Web.RedirectResponse");
			const RenderContainer = use("Runtime.Web.RenderContainer");
			let container = new RenderContainer();
			container.request = await this.createRequest(request);
			
			/* Setup route */
			container.route = routeInfo.copy();
			container.route.matches = new RuntimeMap(
				Object.assign({}, request.params)
			);
			
			/* Resolve route */
			await container.resolveRoute();
			container.createResponse();
			
			/* Set http code */
			reply.code(container.response.http_code);
			
			/* Send headers */
			const headers = {};
			for (let key in container.response.headers.keys())
			{
				headers[key.toLowerCase()] = container.response.headers.get(key);
			}
			
			/* Set redirect location */
			if (container.response instanceof RedirectResponse)
			{
				headers["location"] = container.response.redirect;
			}
			
			/* Set default content type */
			if (headers["content-type"] == undefined)
			{
				headers["content-type"] = "text/html; charset=utf8";
			}
			
			/* Send data */
			reply.headers(headers);
			reply.send(container.response.getContent());
		}
	}
	
	
	/**
	 * Convert route
	 */
	convertRoute(route)
	{
		return route.replace(/\{([^}]+)\}/g, ':$1');
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
			
			/* Register route in Fastify */
			this.fastify[method](
				this.convertRoute(routeInfo.uri),
				this.request(routeInfo)
			)
		}
	}
	
	
	/**
	 * Generate HTML error page
	 */
	generateErrorHtml(error, request)
	{
		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Error 500</title>
				<style>
					body { font-family: Arial, sans-serif; text-align: center; }
					h1 { color: #e74c3c; }
					.error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px auto; max-width: 800px; display: none; }
					.stack { font-size: 12px; text-align: left; margin-top: 20px; }
				</style>
			</head>
			<body>
				<h1>Server Error (500)</h1>
				<div class="error">
					<p><strong>Error:</strong> ${error.message}</p>
				</div>
				<div class="stack">
					<pre>${error.stack}</pre>
				</div>
			</body>
			</html>
		`;
	}
	
	
	/**
	 * Init provider
	 */
	async init()
	{
		const context = rtl.getContext();
		const hook = context.provider("hook");
		
		/* Create fastify instance */
		this.createFastify();
		
		/* Register form body plugin - REQUIRED for HTML forms */
		const formBody = require("@fastify/formbody");
		this.fastify.register(formBody);
		
		/* Register multipart for file uploads */
		const multipart = require("@fastify/multipart");
		this.fastify.register(multipart, {
			limits: {
				fileSize: 1 * 1024 * 1024,
			},
		});
		
		/* Error handler - using setErrorHandler instead of onError */
		this.fastify.setErrorHandler((error, request, reply) => {
			console.error(`Error at ${request.url}:`, error.stack);
			
			/* Set status code */
			reply.code(error.statusCode || 500);

			/* Set content type */
			reply.type('text/html');
			
			/* Send HTML error page */
			reply.send(this.generateErrorHtml(error, request));
		});
		
		/* Static files */
		if (this.static)
		{
			const staticPlugin = require("@fastify/static");
			for (let key in this.static)
			{
				let obj = this.static[key];
				try
				{
					let stat = await fs.stat(obj.path);
					obj.isDirectory = stat.isDirectory();
					
					if (obj.isDirectory)
					{
						this.fastify.register(staticPlugin, {
							root: obj.path,
							prefix: obj.uri,
						});
					}
					else
					{
						this.fastify.get(obj.uri, async (req, reply) => {
							reply.sendFile(obj.path);
						});
					}
				}
				catch (err)
				{
				}
			}
			
			const route_prefix = context.env("ROUTE_PREFIX");
			
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
		/* Start Fastify server */
		await this.fastify.listen({
			port: this.port,
			host: this.host
		});
		console.log(`Server listening on ${this.host}:${this.port}`);
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
		return "Runtime.Web.Fastify";
	}
}

use.add(Fastify);
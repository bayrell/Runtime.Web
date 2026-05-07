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
const http = require("http");
const ws = require("ws");
const multer = require("multer");
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
		this.upload = null;
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
		this.server = http.createServer(this.instance);
		this.websocket = new ws.WebSocketServer({
			server: this.server
		});
		
		/* Enable JSON and URL-encoded parsers */
		this.instance.enable("strict routing");
		this.instance.use(express.json());
		this.instance.use(express.urlencoded({ extended: true }));
		
		this.upload = multer({
			storage: multer.memoryStorage(),
			limits: {
				fileSize: 1 * 1024 * 1024,
			}
		});
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
	 * Convert uri to express format
	 */
	convertUri(uri)
	{
		return uri.replace(/\{([^}]+)\}/g, ':$1');
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
		
		/* Set request payload based on content type */
		const contentType = req.headers['content-type'] || '';
		
		if (contentType.includes('application/json') ||
			contentType.includes('multipart/form-data') ||
			contentType.includes('application/x-www-form-urlencoded')
		)
		{
			if (req.body)
			{
				const body = JSON.parse(
					JSON.stringify(req.body)
				);
				request.payload = rtl.fromNative(body);
			}
		}
		
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
			const RuntimeMap = use("Runtime.Map");
			const RedirectResponse = use("Runtime.Web.RedirectResponse");
			const RenderContainer = use("Runtime.Web.RenderContainer");
			let container = new RenderContainer();
			container.request = this.createRequest(request);
			
			/* Setup route */
			if (routeInfo)
			{
				container.route = routeInfo.copy();
				
				/* Setup matches */
				const matches = request.params || {};
				container.route.matches = new RuntimeMap(matches);
			}
			
			/* Resolve route */
			await container.resolveRoute();
			container.createResponse();
			
			/* Response not found */
			if (container.response == null)
			{
				response.status(404);
				response.send("Page not found");
				return;
			}
			
			/* Set http code */
			response.status(container.response.http_code);
			
			/* Set redirect location */
			if (container.response instanceof RedirectResponse)
			{
				response.location(container.response.redirect);
				response.send();
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
			
			/* Convert uri to express format */
			let expressUri = this.convertUri(routeInfo.uri);
			
			/* Register route */
			if (method == "post")
			{
				this.instance[method](
					expressUri,
					this.upload.none(), this.request(routeInfo)
				)
			}
			else
			{
				this.instance[method](
					expressUri, this.request(routeInfo)
				)
			}
		}
		
		const handler = this.request(null);
		this.instance.use(async (request, response) => {
			await handler(request, response);
		});
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
		
		/* Init web socket */
		await this.initWebSocket();
	}
	
	
	/**
	 * Init websocket
	 */
	async initWebSocket()
	{
		const context = rtl.getContext();
		const Map = use("Runtime.Map");
		const ObjectType = use("Runtime.Serializer.ObjectType");
		const Socket = use("Runtime.Web.Socket");
		const SocketProvider = use("Runtime.Web.SocketProvider");
		const providers = context.providers.filter(
			(item) => item instanceof SocketProvider
		);
		const urls = [];
		providers.each((provider) => {
			const url = provider.constructor.url();
			
			let match = url;
			const params = [];
			const matches = [...url.matchAll(/{(.*?)}/g)];
			if (matches)
			{
				for (let item of matches)
				{
					const name = item[1];
					params.push(name);
					match = match.replace(
						"{" + name + "}", "([^//]*?)"
					)
				}
			}
			
			urls.push({provider, match});
		});
		const matchUrl = (url) => {
			for (let item of urls)
			{
				const r = new RegExp(item.match);
				if (url.match(r)) return item;
			}
			return null;
		};
		const rules = new ObjectType(new Map({
			"extends": "Runtime.BaseDTO",
			"autocreate": true,
		}));
		this.websocket.on("connection", (ws, request) => {
			
			const url = request.url;
			const item = matchUrl(url);
			
			/* Check url */
			if (!item)
			{
				ws.terminate();
				return;
			}
			
			const socket = new Socket(ws);
			const provider = item.provider;
			
			provider.connected(socket);
			
			ws.on("message", (message) => {
				const data = rtl.jsonDecode(message);
				const item = rules.filter(data, []);
				provider.onMessage(socket, item);
			});
			
			ws.on("close", () => {
				provider.disconnected(socket);
			})
		});
	}
	
	
	/**
	 * Start provider
	 */
	async start()
	{
		/* Start server */
		this.server.listen(this.port);
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
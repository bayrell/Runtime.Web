<?php

/*!
 *  Bayrell Runtime Library
 *
 *  (c) Copyright 2016-2023 "Ildar Bikmamatov" <support@bayrell.org>
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

namespace Runtime\Web;

use \Runtime\rtl;
use \Runtime\BaseProvider;
use \Runtime\Web\AppHook;
use \Runtime\Web\RenderResponse;


class RenderProvider extends BaseProvider
{
	
	/**
	 * Start provider
	 */
	function start()
	{
		$ctx = rtl::getContext();
		$hook = $ctx->provider("hook");
		$hook->register(AppHook::RESPONSE, rtl::method($this, "response"));
	}
	
	
	/**
	 * Response
	 **/
	function response($d)
	{
		$container = $d->get("container");
		$response = $container->response;
		
		/* Render tempate */
		if ($response instanceof RenderResponse && $response->get("content") == null)
		{
			$layout = $response->get("layout");
			$class_name = $response->get("class_name");
			$page_class = $layout->get("page_class");
			$page_model = rtl::attr($layout, ["pages", $page_class]);
			
			$render = rtl::method($class_name, "render");
			
			$content = $render($layout, ["pages", $page_class], null, null);
			
			$container->response = rtl::setAttr($container->response, ["content"], $content);
		}
	}
	
}
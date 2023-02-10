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
use \Runtime\Collection;
use \Runtime\Dict;
use \Runtime\Vector;
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
		$hook->register(AppHook::RESPONSE, $this, "response", 9999);
	}
	
	
	/**
	 * Response
	 **/
	function response($d)
	{
		$context = rtl::getContext();
		$container = $d->get("container");
		$response = $container->response;
		
		/* Get css names */
		$css_class_names = new Vector();
		
		/* Add layout class name */
		$layout = $container->layout;
		$layout_name = $layout->layout_name;
		$layout_class_name = $layout::getLayoutClass($layout_name);
		$css_class_names->pushValue($layout_class_name);
		
		/* Extends css class names */
		$d = $context->callHook(AppHook::CSS_CLASS_NAMES, Dict::from([
			"container" => $container,
			"css_class_names" => $css_class_names,
		]));
		$css_class_names = $d->get("css_class_names");
		
		/* Save css */
		$context->callHook(AppHook::CSS_SAVE, Dict::from([
			"container" => $container,
			"css_class_names" => $css_class_names,
		]));
		
		/* Render tempate */
		if ($response instanceof RenderResponse && $response->get("content") == null)
		{
			$layout = $response->layout;
			
			$d = $context->callHook(AppHook::CORE_UI, Dict::from([
				"core_ui" => "Runtime.Web.CoreUI",
			]));
			$core_ui = $d->get("core_ui");
			
			$render = rtl::method($core_ui, "render");
			$content = $render($layout, \Runtime\Collection::from([]), \Runtime\Dict::from([
				"container" => $container
			]), null);
			
			$container->response = rtl::setAttr($container->response, ["content"], $content);
		}
		
		return $d;
	}
	
}
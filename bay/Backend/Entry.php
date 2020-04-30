<?php
/*!
 *  Bayrell Runtime Library
 *
 *  (c) Copyright 2016-2020 "Ildar Bikmamatov" <support@bayrell.org>
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

namespace Runtime\Web\Backend;

use Runtime\Collection;
use Runtime\Dict;


class Entry
{
	
	/**
	 * Run Web Request
	 */
	static function run($ctx)
	{
		$main_class = \Runtime\rtl::find_class($ctx->main_class);
		$request = \Runtime\Web\Request::createPHPRequest($ctx);
		
		try
		{
			if ($main_class)
			{
				$container = $main_class::appRequest($ctx, $ctx, $request);
			}
			else
			{
				throw new \Exception("Main class is not set");
			}
			
			/* Output web response */
			static::output_web_response($ctx, $container);
		}
		catch (\Exception $ex)
		{
			$this->return_code = 1;
			static::output_web_exception($ctx, $ex);
		}
	}
	
	
	
	/**
	 * Output Web Resonse
	 */
	static function output_web_response($ctx, $container)
	{
		if ($container != null && $container->response)
		{
			http_response_code($container->response->http_code);
			if ($container->cookies != null)
			{
				$keys = $container->cookies->keys($ctx);
				for ($i=0; $i<$keys->count($ctx); $i++)
				{
					$key = $keys->item($ctx, $i);
					$cookie = $container->cookies->item($ctx, $key);
					if ($cookie != null && $cookie->name)
					{
						setcookie(
							$cookie->name,
							$cookie->value,
							$cookie->expire,
							$cookie->path,
							$cookie->domain,
							$cookie->secure,
							$cookie->httponly
						);
					}
				}
			}
			if ($container->response->headers != null)
			{
				$keys = $container->response->headers->keys($ctx);
				for ($i=0; $i<$keys->count($ctx); $i++)
				{
					$key = $keys->item($ctx, $i);
					$value = $container->response->headers->item($ctx, $key);
					header($key . ": " . $value);
				}
			}
			echo $container->response->staticMethod("getContent")($ctx, $container->response);
		}
		else
		{
			static::output_404($container);
		}
	}
	
	
	
	/**
	 * Output 404 Error
	 */
	static function output_404($container)
	{
		http_response_code(404);
		echo "404 Not found";
	}
	
	
	
	/**
	 * Excetion
	 */
	static function output_web_exception($ctx, $ex)
	{
		echo "<pre>";
		echo "<b>Fatal Error</b>: " . $ex->getMessage();
		echo "\n";
		echo $ex->getTraceAsString();
		echo "</pre>";
	}	
		
}
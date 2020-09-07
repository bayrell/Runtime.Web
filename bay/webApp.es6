function runWebApp(main_module, env)
{
	/* Create context */
	var context = Runtime.Core.Context.create(null, Runtime.Dict.from(env));

	/* Set context params */
	context = context.copy(context, {
		"start_time": Date.now(),
	});

	/* Set entry point */
	context = context.constructor.setMainModule(context, context, main_module);
	
	/* Set global context */
	Runtime.RuntimeUtils.setContext(context);

	/* Run app */
	(async () => {
		try
		{
			/* Run entry */
			context = await context.constructor.run
			(
				context,
				context,
				
				/* Before start */
				async (ctx, c) =>
				{
					return c;
				},
				
				/* Before run */
				async (ctx, c) =>
				{
					/* Set global context */
					window["globalContext"] = c;
					Runtime.RuntimeUtils.setContext(c);
					return c;
				}
			);
		}
		catch (e)
		{
			console.log( e.stack );
		}
	})();
	
	return context;
}
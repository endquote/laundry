# Washers

Washers contain the logic that is run by jobs. They inherit from a [base washer class](https://github.com/endquote/laundry/blob/master/washer.js), and their main methods are `doInput` and `doOutput`. `doInput` accesses some API or data source and returns a number of [Items](https://github.com/endquote/laundry/blob/master/items/README.md). `doOutput` accepts a number of Items and does something with them. A washer can have both input and output methods, or either one.

In addition to the input/output methods, there are `input` and `output` properties, which are objects describing the steps required to configure the washer. These are questions asked on the command-line when the job is being created or edited.

```javascript
this.input = _.merge({
	// Shown in the list of washers
    description: 'Loads data from an RSS feed.',

    // An array of settings to ask about
    settings: [{

    	// The property name to save this setting as. 
        name: 'url',

        // The prompt to give the user.
        prompt: 'What RSS feed URL do you want to launder?',

        // Called before asking the user for a value, callback indicating whether a
        // response is required, what the prompt should be, and a suggested default.
        beforeEntry: function(rl, job, prompt, callback(required, prompt, suggest)),

        // Called after the user has entered a value, so it can be validated, modified
        // or acted upon in some way. Callback indicating whether the value is valid,
        // and what the new value is.
        afterEntry: function(rl, job, oldValue, newValue, callback(err, newValue))
    }]
}, this.input);
```

Jobs are saved in a JSON file, and washers are saved as properties of those jobs. Any property of the washer will be saved and can be used when the job is run. Properties beginning with `_` will not be saved.

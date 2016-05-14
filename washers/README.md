# Washers

Washers contain the logic that is run by jobs. They inherit from a [base washer class](https://github.com/endquote/laundry/blob/master/washer.js), and their main methods are `doInput` and `doOutput`. `doInput` accesses some API or data source and returns a number of [Items](https://github.com/endquote/laundry/blob/master/items/README.md). `doOutput` accepts a number of Items and does something with them. A washer can have both input and output methods, or either one.

In addition to the input/output methods, there are `input` and `output` properties, which are objects describing the steps required to configure the washer. These are questions asked on the command-line when the job is being created or edited.

```javascript
this.input = _.merge({
    // Shown in the list of washers
    description: 'Loads data from an RSS feed.',

    // An array of settings to ask about, in the format of Inquirer.js prompt objects
    // https://github.com/SBoudrias/Inquirer.js
    prompts: [{
        // The type of question to ask, default is "input"
        type: 'input',

        // The property name to save this setting as. 
        name: 'url',

        // The prompt to give the user.
        message: 'What RSS feed URL do you want to launder?',

        // Called after a value is entered, return true if it's valid, false or an error message if not.
        // The default validation function ensures the value is not an empty string.
        validate: function(answer)

        // Called after a valid value is entered, return it modified if needed.
        filter: function(value),

        // Return a default value for this setting, or set to a string
        default: function(),

        // An addition to the inquirer functionality -- if you need to set a default or other property based on the job.
        setup: function(job)
    }]
}, this.input);
```

Jobs are saved in a JSON file, and washers are saved as properties of those jobs. Any property of the washer will be saved and can be used when the job is run. Properties beginning with `_` will not be saved.

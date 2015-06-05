// Basic class representing an item from anywhere.
var Item = function(config) {
    this.title = null;
    this.description = null;
    this.url = null;
    this.date = null;
    this.author = null;
    this.tags = null;
    this.verbs = null;

    if (config) {
        for (var i in config) {
            this[i] = config[i];
        }
    }
}

module.exports = Item;
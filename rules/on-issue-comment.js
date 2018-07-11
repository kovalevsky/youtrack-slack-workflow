// Thanks to Michael Rush for the original version of this rule (https://software-development.dfstudio.com/youtracks-new-javascript-workflows-make-slack-integration-a-breeze-d3275605d565)

// IMPORTANT: Use a valid Incoming Webhook from Slack. To get one, go to https://my.slack.com/services/new/incoming-webhook/
var SLACK_WEBHOOK_URL = 'CHANGE_THIS';

var entities = require('@jetbrains/youtrack-scripting-api/entities');
var http = require('@jetbrains/youtrack-scripting-api/http');
var workflow = require('@jetbrains/youtrack-scripting-api/workflow');

exports.rule = entities.Issue.onChange({
  title: workflow.i18n('Send notification to slack on new issue comments'),
  guard: function(ctx) {
    return ctx.issue.comments.added.isNotEmpty();
  },
  action: function(ctx) {
    var issue = ctx.issue;

    var issueLink = '<' + issue.url + "|" + issue.id + '>';

    issue.comments.added.forEach(function(comment) {
      var commentLink = '<' + comment.url + "|" + issue.summary + '>';

      var author = comment.author.fullName;

      var payload = {
        "attachments": [{
          "fallback": commentLink + " (" + issueLink + ")",
          "pretext": commentLink + " (" + issueLink + ")",
          "color": "#edb431",
          "author_name": author,
          "fields": [
          {
            "title": "Message",
            value: comment.text
          }]
        }]
      };

      var connection = new http.Connection(SLACK_WEBHOOK_URL, null, 2000);
      var response = connection.postSync('', null, JSON.stringify(payload));
      if (!response.isSuccess) {
        console.warn('Failed to post notification to Slack. Details: ' + response.toString());
      }

    });

  },
  requirements: {
  }
});

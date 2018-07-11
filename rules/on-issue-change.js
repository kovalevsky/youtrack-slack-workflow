// Thanks to Michael Rush for the original version of this rule (https://software-development.dfstudio.com/youtracks-new-javascript-workflows-make-slack-integration-a-breeze-d3275605d565)

// IMPORTANT: Use a valid Incoming Webhook from Slack. To get one, go to https://my.slack.com/services/new/incoming-webhook/
var SLACK_WEBHOOK_URL = 'CHANGE_THIS';

var COLORS = {
  onNew: '#000080',
  onStateChange: '#408002',
  onResolve: '#108040',
  onReopen: '#800002'
}

var entities = require('@jetbrains/youtrack-scripting-api/entities');
var http = require('@jetbrains/youtrack-scripting-api/http');
var workflow = require('@jetbrains/youtrack-scripting-api/workflow');

exports.rule = entities.Issue.onChange({
  title: workflow.i18n('Send notification to slack when an issue is reported, resolved, or reopened'),
  guard: function(ctx) {
    return ctx.issue.becomesReported ||
      ctx.issue.fields.becomesResolved ||
      ctx.issue.becomesUnresolved ||
      (ctx.issue.isReported && ctx.issue.fields.isChanged(ctx.State) || ctx.issue.fields.isChanged(ctx.Assignee));
  },
  action: function(ctx) {
    var issue = ctx.issue;

    var pretext;
    var text;
    var color;

    var isNew = issue.becomesReported;

    var issueLink = '<' + issue.url + "|" + issue.id + '>';
    var state = issue.fields.State && issue.fields.State.name;
    if (!isNew && issue.fields.isChanged(ctx.State) && issue.oldValue(ctx.State)) {
      state = "~~" + issue.oldValue(ctx.State).name + "~~ " + state;
    }

    if (isNew) {
      pretext = "Created";
      text = issue.descripton;
      color = COLORS.onNew;
    } else if (issue.becomesResolved) {
      pretext = "Resolved";
      color = COLORS.onResolve;
    } else if (issue.becomesUnresolved) {
      pretext = COLORS.onReopen;
    } else if (issue.fields.isChanged(ctx.State)) {
      color = COLORS.onStateChange;
      pretext = "State changed to " + issue.fields.State.name;
    }
    if (issue.fields.isChanged(ctx.Assignee)) {
      if (pretext) {
        pretext += "\n";
      }
      pretext = "Assignee changed to " + issue.fields.Assignee.fullName;
    }

    var changedByName =  isNew ? issue.reporter.fullName : issue.updatedBy.fullName;

    var payload = {
      "text": text,
      "attachments": [{
        "fallback": pretext + " " + issue.summary + " (" + issueLink + ")",
        "pretext": pretext,
        "color": color,
        "author_name": changedByName,
        "title": issue.id + " " + issue.summary,
        "title_link": issue.url,
        "text": text,
        "fields": [
          {
            "title": "State",
            "value": state,
            "short": true
          },
          {
            "title": "Priority",
            "value": issue.fields.Priority ? issue.fields.Priority.name : "Empty",
            "short": true
          },
          {
            "title": "Assignee",
            "value": issue.fields.Assignee ? issue.fields.Assignee.fullName : "Empty",
            "short": true
          }
        ]
      }]
    };

    var connection = new http.Connection(SLACK_WEBHOOK_URL, null, 2000);
    var response = connection.postSync('', null, JSON.stringify(payload));
    if (!response.isSuccess) {
      console.warn('Failed to post notification to Slack. Details: ' + response.toString());
    }
  },
  requirements: {
    Priority: {
      type: entities.EnumField.fieldType
    },
    State: {
      type: entities.State.fieldType
    },
    Assignee: {
      type: entities.User.fieldType
    }
  }
});

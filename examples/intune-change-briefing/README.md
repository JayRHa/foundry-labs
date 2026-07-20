# Intune Change Briefing

This example reviews a proposed Microsoft Intune change with a Claude model
deployed in Microsoft Foundry. It produces a structured second opinion before
the normal change-approval process continues.

The example is deliberately read-only:

- It reads a local JSON file.
- It sends the proposed change to the selected model deployment.
- It prints or saves the review.
- It does not connect to Microsoft Intune.
- It does not approve or execute the change.

## Architecture

```text
change.example.json
        |
        v
schema validation
        |
        v
Claude deployment in Microsoft Foundry
        |
        v
structured change briefing
        |
        v
human review and normal approval process
```

## 1. Confirm the deployment

Seeing a model in the Foundry catalog does not mean it has already been
deployed. Check the deployment and its provisioning state:

```bash
az cognitiveservices account deployment list \
  --resource-group <resource-group> \
  --name <foundry-account> \
  --query "[].{deployment:name,model:properties.model.name,state:properties.provisioningState}" \
  --output table
```

The value in the `deployment` column is the value you use for
`ANTHROPIC_FOUNDRY_DEPLOYMENT`.

## 2. Prepare the local environment

Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

On PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Set the endpoint and deployment name:

```bash
export ANTHROPIC_FOUNDRY_BASE_URL="https://<resource-name>.services.ai.azure.com/anthropic"
export ANTHROPIC_FOUNDRY_DEPLOYMENT="claude-intune-review"
```

The endpoint must be the Anthropic endpoint of the Foundry resource. Do not use
the project endpoint ending in `/api/projects/<project>` here.

For local authentication:

```bash
az login
az account set --subscription "<subscription-name-or-id>"
```

`DefaultAzureCredential` also supports managed identity and service-principal
authentication. Prefer managed identity when you deploy the example.

## 3. Validate before calling the model

Dry-run mode validates the JSON and renders the exact request without needing
Azure credentials:

```bash
python review_change.py change.example.json --dry-run
```

This is useful for pull requests and CI because it catches missing fields before
an API request consumes tokens.

## 4. Run the review

```bash
python review_change.py change.example.json
```

Save the result as a Markdown artifact:

```bash
python review_change.py change.example.json \
  --output output/change-review.md
```

The model must return:

1. Decision: `READY`, `READY WITH CONDITIONS`, or `NOT READY`
2. Main risks
3. Missing prerequisites
4. Pilot and rollout plan
5. Rollback plan
6. Questions for the change owner

The wording may change between runs. The behavioral contract should not.

## 5. Adapt the input

Copy the example file and keep it in source control:

```bash
cp change.example.json change.my-pilot.json
```

At minimum, supply:

- `title`
- `scope`
- `owner`
- `planned_start`
- `success_criteria`
- `rollback`
- `known_risks`

The script rejects an incomplete document instead of letting the model guess.
You can extend `REQUIRED_FIELDS` and the system prompt for security baselines,
Windows update rings, application deployments, Conditional Access changes, or
Azure infrastructure changes.

## 6. Run the tests

```bash
python -m unittest discover -s tests -v
```

The tests do not call Azure. They verify input validation, prompt construction,
and response extraction.

## Optional: schedule an agent version

The direct model call is the best place to understand and test the behavior.
After you convert it into a deployed Foundry agent, the included
[`routine.yaml`](routine.yaml) shows how to schedule a weekday briefing.

```bash
azd extension install azure.ai.routines
azd ai routine create daily-intune-change-briefing --file routine.yaml
azd ai routine show daily-intune-change-briefing --output json
azd ai routine dispatch daily-intune-change-briefing
azd ai routine run list daily-intune-change-briefing
```

Routines are a preview feature, require `azd` 1.27.0 or later, and reference an
agent that must already exist. The manifest does not deploy the agent.

## Production checklist

- Use managed identity instead of a developer sign-in.
- Grant only the permissions required to call the model.
- Keep the first version read-only.
- Remove confidential tenant data that the review does not need.
- Define a release set with difficult and incomplete changes.
- Evaluate hallucination, decision consistency, and rollback detection.
- Add a human approval point outside the model.
- Apply a retention policy to inputs and generated reviews.
- Confirm model availability, hosting, and data-zone requirements.

## Troubleshooting

### A model appears in the catalog but the request fails

Confirm that the model is deployed and that the deployment state is
`Succeeded`. Use the deployment name, not only the catalog model name.

### Authentication fails

Run `az account show` and verify the active subscription. The signed-in identity
also needs access to invoke the deployment.

### The endpoint returns 404

Verify that `ANTHROPIC_FOUNDRY_BASE_URL` ends in `/anthropic` and does not contain
the Foundry project path.

### The model rejects `thinking` or `output_config`

Capabilities differ between model versions and hosting options. Remove those
two optional arguments from `client.messages.create`, or select a deployment
that supports them.

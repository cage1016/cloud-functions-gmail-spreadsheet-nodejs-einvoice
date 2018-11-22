oauth2init:
	gcloud functions deploy oauth2init --runtime nodejs8 --trigger-http --region=us-central1

oauth2callback:
	gcloud functions deploy oauth2callback --runtime nodejs8 --trigger-http --region=us-central1

initWatch:
	gcloud functions deploy initWatch --runtime nodejs8 --trigger-http --region=us-central1

onNewmessage:
	gcloud functions deploy onNewMessage --runtime nodejs8 --trigger-topic einvoice --region=us-central1


deploy: oauth2init oauth2callback initWatch onNewmessage
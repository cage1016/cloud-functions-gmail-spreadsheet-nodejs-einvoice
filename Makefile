define GetFromConfig
$(shell node -p "require('./config.json').$(1)")
endef

GCF_REGION := $(call GetFromConfig,GCF_REGION)
GCLOUD_PROJECT := $(call GetFromConfig,GCLOUD_PROJECT)
TOPIC_ID := $(call GetFromConfig,TOPIC_ID)

oauth2init:
	gcloud functions deploy oauth2init --runtime nodejs8 --trigger-http --region=$(GCF_REGION) --project=$(GCLOUD_PROJECT)

oauth2callback:
	gcloud functions deploy oauth2callback --runtime nodejs8 --trigger-http --region=$(GCF_REGION) ---project=$(GCLOUD_PROJECT)

initWatch:
	gcloud functions deploy initWatch --runtime nodejs8 --trigger-http --region=$(GCF_REGION) --project=$(GCLOUD_PROJECT)

onNewmessage:
	gcloud functions deploy onNewMessage --runtime nodejs8 --trigger-topic $(TOPIC_ID) --region=$(GCF_REGION) --project=$(GCLOUD_PROJECT)

deploy: oauth2init oauth2callback initWatch onNewmessage
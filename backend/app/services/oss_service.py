from alibabacloud_sts20150401.client import Client as StsClient
from alibabacloud_sts20150401 import models as sts_models
from alibabacloud_tea_openapi import models as open_api_models
from app.core.oss_config import oss_settings


class OSSService:
    def __init__(self):
        self.settings = oss_settings

    def _create_sts_client(self) -> StsClient:
        config = open_api_models.Config(
            access_key_id=self.settings.access_key_id,
            access_key_secret=self.settings.access_key_secret,
        )
        config.endpoint = "sts.aliyuncs.com"
        return StsClient(config)

    async def get_sts_token(self) -> dict:
        client = self._create_sts_client()
        request = sts_models.AssumeRoleRequest(
            role_arn=self.settings.role_arn,
            role_session_name="oss-upload-session",
            duration_seconds=3600,
        )
        response = client.assume_role(request)
        credentials = response.body.credentials
        return {
            "accessKeyId": credentials.access_key_id,
            "accessKeySecret": credentials.access_key_secret,
            "securityToken": credentials.security_token,
            "expiration": credentials.expiration,
            "region": f"oss-{self.settings.region}",
            "bucket": self.settings.bucket,
        }


oss_service = OSSService()

from pydantic_settings import BaseSettings


class OSSSettings(BaseSettings):
    access_key_id: str = ""
    access_key_secret: str = ""
    region: str = "cn-hangzhou"
    bucket: str = ""
    role_arn: str = ""

    class Config:
        env_file = ".env"
        env_prefix = "OSS_"
        extra = "ignore"


oss_settings = OSSSettings()

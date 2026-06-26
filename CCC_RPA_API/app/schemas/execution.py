from pydantic import BaseModel


class CompanySelectRequest(BaseModel):
    company_id: str
    company_name: str

import os
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter
from pydantic import BaseModel
from supabase import create_client
import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup, NavigableString, Tag

# Load environment variables
load_dotenv(dotenv_path=".env.local")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

router = APIRouter()

class SearchRequest(BaseModel):
    search_term: str

@router.post("/search-event")
async def scrape_ticketmaster(request: SearchRequest):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        url = f"https://www.ticketmaster.sg/activity/{request.search_term}"
        response = await page.goto(url, wait_until='domcontentloaded')
        print("Status:", response.status if response else "No response")

        # Find all matching activity links
        activity_links = []
        links = await page.locator("a").all()
        for link in links:
            href = await link.get_attribute("href")
            if href and "https://ticketmaster.sg/activity/detail" in href:
                if href not in activity_links:
                    activity_links.append(href)

        if len(activity_links) != 1:
            await browser.close()
            return {"num_results": len(activity_links)}

        # Just one result, proceed to scrape details
        activity_link = activity_links[0]
        print(f"Found activity link: {activity_link}")

        await page.goto(activity_link, wait_until='domcontentloaded')
        await page.wait_for_timeout(3000)

        try:
            title = await page.locator("#synopsisEventTitle").text_content()
            venue = await page.locator("#synopsisEventVenue").text_content()
            dates = await page.locator("#synopsisEventDate").text_content()
            content_html= await page.locator("#activityContent").inner_html()
            soup = BeautifulSoup(content_html, "html.parser")
            collected_text = []
            for elem in soup.contents:
                if isinstance(elem, Tag) and elem.name == "br":
                    break  # Stop at the first <br>
                if isinstance(elem, NavigableString):
                    collected_text.append(elem.strip())
                elif isinstance(elem, Tag):
                    collected_text.append(elem.get_text(strip=True))
                    
            clean_text = " ".join(filter(None, collected_text))
            print(clean_text)
            
            img_src = ""
            imgs = await page.locator("img").all()
            for img in imgs:
                src = await img.get_attribute("src")
                if src and "https://static.ticketmaster.sg/images/activity/" in src:
                    img_src = src
                    break

            await browser.close()

            return {
                "num_results": 1,
                "title": title,
                "venue": venue,
                "date": dates,
                "image": img_src,
                "event_url": activity_link,
                "description": clean_text
            }

        except Exception as e:
            await browser.close()
            return {"error": str(e)}

# For testing purposes
# if __name__ == "__main__":
#     asyncio.run(scrape_ticketmaster("tour"))
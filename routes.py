from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models import Course
from utils import read_data, write_data

route = APIRouter()


# ------------------ BASIC ------------------ #

@route.get('/', tags=['root'])
def home():
    return {"message": "Course API is working"}


@route.get('/courses', tags=['get'])
def get_all_courses():
    return read_data()


@route.get('/courses/{course_id}', tags=['get'])
def get_course(course_id: int):
    data = read_data()
    course = [c for c in data if c['id'] == course_id]

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return course


# ------------------ CREATE ------------------ #

@route.post('/courses', response_model=Course, tags=['post'])
def create_course(course: Course):
    data = read_data()

    new_id = max([c['id'] for c in data]) + 1 if data else 1

    new_course = course.dict()
    new_course['id'] = new_id

    data.append(new_course)
    write_data(data)

    return new_course


# ------------------ UPDATE ------------------ #

@route.put('/courses/{course_id}', tags=['put'])
def update_course(course_id: int, course: Course):
    data = read_data()

    for i, c in enumerate(data):
        if c['id'] == course_id:
            updated = course.dict()
            updated['id'] = course_id

            data[i] = updated
            write_data(data)
            return {"message": "Updated successfully"}

    raise HTTPException(status_code=404, detail="Course not found")


# ------------------ DELETE ------------------ #

@route.delete('/courses/{course_id}', tags=['delete'])
def delete_course(course_id: int):
    data = read_data()

    for i, c in enumerate(data):
        if c['id'] == course_id:
            data.pop(i)
            write_data(data)
            return {"message": "Deleted successfully"}

    raise HTTPException(status_code=404, detail="Course not found")


# ------------------ FILTER ------------------ #

@route.get('/courses/filter', tags=['filter'])
def filter_courses(
    category: Optional[str] = Query(None, description="Filter by category"),
    instructor: Optional[str] = Query(None, description="Filter by instructor"),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    is_published: Optional[bool] = Query(None)
):
    data = read_data()

    if category:
        data = [c for c in data if c['category'] == category.lower()]

    if instructor:
        data = [c for c in data if c['instructor'] == instructor]

    if min_price is not None:
        data = [c for c in data if c['price'] >= min_price]

    if max_price is not None:
        data = [c for c in data if c['price'] <= max_price]

    if is_published is not None:
        data = [c for c in data if c['is_published'] == is_published]

    return {"data": data}


# ------------------ PAGINATION ------------------ #

@route.get('/courses/paginated', tags=['pagination'])
def get_paginated_courses(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    data = read_data()

    start = (page - 1) * limit
    end = start + limit

    return {
        "total": len(data),
        "page": page,
        "limit": limit,
        "data": data[start:end]
    }
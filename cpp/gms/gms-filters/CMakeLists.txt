cmake_minimum_required(VERSION 3.20)
include(CMakePrintHelpers)

PROJECT(GMS_CFILTERS LANGUAGES C VERSION 1.0.1 DESCRIPTION "GMS FILTERS")
SET(GMS_CFILTERS_SRC
    src/constants.h src/enums.h
    src/filter_iir.c src/filter_iir.h
)
SET(GMS_LIB_FOLDER ${CMAKE_BINARY_DIR}/lib/)
SET(GMS_INCLUDE_FOLDER ${CMAKE_BINARY_DIR}/include/)
ADD_LIBRARY(gmscfilters ${GMS_CFILTERS_SRC})
SET_TARGET_PROPERTIES(gmscfilters PROPERTIES PUBLIC_HEADER filterslib.h)
SET_TARGET_PROPERTIES(gmscfilters PROPERTIES VERSION ${PROJECT_VERSION})

ADD_CUSTOM_COMMAND(TARGET gmscfilters POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:gmscfilters> ${GMS_LIB_FOLDER}
)

if(NOT CMAKE_CXX_COMPILER_ID STREQUAL "Emscripten")
    if(WITH_UNIT_TESTS)
        message(STATUS "C tests enabled")
        add_subdirectory(./tests)
        if(WITH_COVERAGE)
            ADD_CUSTOM_COMMAND(TARGET gmscfilters POST_BUILD
            COMMAND gcovr -r ${PROJECT_SOURCE_DIR}/../../
                          -f ${PROJECT_SOURCE_DIR} 
                          -e '/.*/${CMAKE_BINARY_DIR}/' . 
                          --xml=${CMAKE_BINARY_DIR}/gms-filters.coverage.xml 
                          --sonarqube=${CMAKE_BINARY_DIR}/gms-filters.sqcoverage.xml)
        endif()
    endif()
endif()
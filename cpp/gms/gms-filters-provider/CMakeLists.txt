cmake_minimum_required(VERSION 3.20)
include(CMakePrintHelpers)

project(GMS LANGUAGES CXX VERSION 1.0.1 DESCRIPTION "GMS Filters Provider")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(GMS_LIB_FOLDER ${CMAKE_BINARY_DIR}/lib)
set(GMS_INCLUDE_FOLDER ${BASE_SOURCE_DIR}/gms/gms-filters/src)

set(GMS_FILTER_PROVIDER_SRC
    src/GmsFilters.hh
    src/FilterProvider.hh src/FilterProvider.cpp
    src/FilterDesigner.hh src/FilterDesigner.cpp
    src/descriptions/BaseFilterDescription.hh src/descriptions/BaseFilterDescription.cpp 
    src/descriptions/BaseLinearFilterDescription.hh src/descriptions/BaseLinearFilterDescription.cpp 
    src/descriptions/CascadedFilterDescription.hh src/descriptions/CascadedFilterDescription.cpp
    src/descriptions/LinearFIRFilterDescription.hh src/descriptions/LinearFIRFilterDescription.cpp
    src/descriptions/LinearIIRFilterDescription.hh src/descriptions/LinearIIRFilterDescription.cpp
    src/parameters/BaseFilterParameters.hh src/parameters/BaseFilterParameters.cpp 
    src/parameters/CascadedFilterParameters.hh src/parameters/CascadedFilterParameters.cpp
    src/parameters/FIRFilterParameters.hh src/parameters/FIRFilterParameters.cpp
    src/parameters/IIRFilterParameters.hh src/parameters/IIRFilterParameters.cpp
    src/wrappers/FilterDescriptionWrapper.hh src/wrappers/FilterDescriptionWrapper.cpp
    src/EmscriptenBindings.hh src/EmscriptenBindings.cpp
    )

    add_library(gmsfiltersprovider ${GMS_FILTER_PROVIDER_SRC})
    set_target_properties(gmsfiltersprovider PROPERTIES PUBLIC_HEADER ./GmsFilters.hh)
    set_target_properties(gmsfiltersprovider PROPERTIES VERSION ${PROJECT_VERSION})
    target_include_directories(gmsfiltersprovider PUBLIC ${GMS_INCLUDE_FOLDER})
    target_link_libraries(gmsfiltersprovider gmscfilters)
    
    ADD_CUSTOM_COMMAND(TARGET gmsfiltersprovider POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:gmsfiltersprovider> ${GMS_LIB_FOLDER}
    )

if(NOT CMAKE_CXX_COMPILER_ID STREQUAL "Emscripten")
    if(WITH_UNIT_TESTS)
        message(STATUS "CPP tests enabled")
        if(WITH_COVERAGE)
            ADD_CUSTOM_COMMAND(TARGET gmsfiltersprovider POST_BUILD
                COMMAND gcovr -r ${PROJECT_SOURCE_DIR}/../../
                              -f ${PROJECT_SOURCE_DIR} 
                              -e '/.*/${CMAKE_BINARY_DIR}/' . 
                              --xml=${CMAKE_BINARY_DIR}/gms-filters-provider.coverage.xml 
                              --sonarqube=${CMAKE_BINARY_DIR}/gms-filters-provider.sqcoverage.xml)
        endif()
        add_subdirectory(./tests)
    endif()
endif()

if(CMAKE_CXX_COMPILER_ID STREQUAL "Emscripten")
    SET(GMS_WASM_OUTPUT_FOLDER ${CMAKE_BINARY_DIR}/wasm)
    FILE(MAKE_DIRECTORY ${GMS_WASM_OUTPUT_FOLDER})
    ADD_CUSTOM_COMMAND(TARGET gmsfiltersprovider POST_BUILD
        COMMAND em++ --bind -O3 -Wl,--whole-archive ${GMS_LIB_FOLDER}/libgmsfiltersprovider.a -Wl,--no-whole-archive ${GMS_LIB_FOLDER}/libgmscfilters.a
        -o ${GMS_WASM_OUTPUT_FOLDER}/gms-filters-provider.js
        --std=c++17
        -s EXPORTED_FUNCTIONS='["_cascadedFilterApply",
                                "_iirFilterApply",
                                "_firFilterApply",
                                "_malloc",
                                "_free"]'
        -s EXPORTED_RUNTIME_METHODS=ccall,cwrap,setValue,getValue
        -s ALLOW_MEMORY_GROWTH=1     
        -s LLD_REPORT_UNDEFINED
        -s EXPORT_NAME=gmsfilters
        -s SINGLE_FILE=1
        -s EXPORT_ES6=0
        -s USE_ES6_IMPORT_META=0
        -s MODULARIZE=1
        
        )
endif()
